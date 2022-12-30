import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { S3 } from 'aws-sdk';
import { randomBytes } from 'crypto';
import * as moment from 'moment';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { AuthService } from 'src/auth/auth.service';
import { baseUrl } from 'src/common/helper';
import { FcmTokenService } from 'src/fcm-token/fcm-token.service';
import { FixtureStatus } from 'src/fixtures/fixture.entity';
import { ProfilePicturesService } from 'src/profile-pictures/profile-pictures.service';
import { ReportUserProfileDto } from 'src/user-report/dto/report-user-profile.dto';
import { UserReportService } from 'src/user-report/user-report.service';
import {
  DeepPartial,
  FindConditions,
  FindManyOptions,
  getConnection,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import { QueryPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ActionsEnum } from './dto/match-unmatch.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NextActionEnum, RoleType, User } from './user.entity';
import { InjectAwsService } from 'nest-aws-sdk';

@Injectable()
export class UsersService {
  /**
   * Match / Un-match user
   */
  async matchUnmatchUser(authUser: User, userId: number, action: ActionsEnum) {
    try {
      await getConnection().query(
        `
                    UPDATE fixtures SET status = ?
                    WHERE id IN (
                        SELECT * FROM (
                            SELECT f1.id FROM fixtures f1
                            INNER JOIN participants p1 ON p1.id = f1.first_participant_id
                            INNER JOIN participants p2 ON p2.id = f1.second_participant_id
                            WHERE p1.user_id = ? AND p2.user_id = ?
                            AND f1.status IN (?)
                        ) t
                    )
                `,
        [
          action,
          authUser.id,
          userId,
          [FixtureStatus.JOINED, FixtureStatus.LIKED, FixtureStatus.DISLIKED],
        ],
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Report user profile
   */
  async reportUserProfile(
    authUser: User,
    user: number,
    reportUserProfileDto: ReportUserProfileDto,
  ): Promise<void> {
    await this.findOneOrFail({ id: user });
    this.userReportService.reportUserProfile(
      authUser.id,
      user,
      reportUserProfileDto,
    );
  }
  /**
   * Verify email verification link
   */
  async verifyEmailVerificationLink(token: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user || new Date() > user.emailVerificationTokenExpiresAt) {
      throw new NotFoundException('The link is invalid or expired');
    }

    await this.userRepo.update(user.id, {
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
      emailVerifiedAt: new Date(),
    });

    return user;
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: number): Promise<User> {
    try {
      return await this.userRepo.findOneOrFail({
        where: {
          id: userId,
          role: RoleType.USER,
        },
        relations: ['profilePictures'],
      });
    } catch (error) {
      if (error.name === 'EntityNotFoundError') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  /**
   * De-active account
   */
  async deactivateAccount(authUser: User): Promise<void> {
    authUser.deactivatedAt = new Date();
    await this.userRepo.save(authUser);
  }

  /**
   * Change email
   */
  async changeEmail(authUser: User, newEmail: string): Promise<void> {
    if (authUser.emailVerifiedAt) {
      throw new BadRequestException(
        "You cannot change email once it's verified",
      );
    } else if (authUser.email === newEmail) {
      throw new BadRequestException('Your old email and new email are same');
    }

    const user = await this.findOne({
      where: {
        email: newEmail,
        id: Not(authUser.id),
        deactivatedAt: IsNull(),
      },
    });

    if (user) {
      throw new ConflictException('An account already exists with this email');
    }

    const newUser = await this.userRepo.save(
      this.userRepo.create({
        ...authUser,
        emailVerifiedAt: null,
        email: newEmail,
      }),
    );

    await this.authService.revokeAllTokens(authUser);
    await this.fcmTokensService.deregister(newUser.id);

    this.sendVerificationEmail(newUser);
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(authUser: User): Promise<void> {
    // generate token
    const token = randomBytes(32).toString('hex');

    await this.userRepo.update(authUser.id, {
      emailVerificationToken: token,
      emailVerificationTokenExpiresAt: moment
        .utc()
        .add('5', 'minutes')
        .toDate(),
    });

    // send mail
    const from = this.configService.get<string>('MAIL_FROM');
    const appName = this.configService.get<string>('APP_NAME');
    this.mailerService.sendMail({
      to: authUser.email,
      from,
      subject: `Please verify your email address`,
      template: 'verification-email',
      context: {
        appName,
        firstName: authUser.firstName,
        link: baseUrl(`/email-verify/${token}`),
      },
    });
  }

  /**
   * Send verification email
   */
  sendForgotPasswordEmail(resetCode: number, authUser: User): void {
    const from = this.configService.get<string>('MAIL_FROM');
    const appName = this.configService.get<string>('APP_NAME');
    this.mailerService.sendMail({
      to: authUser.email,
      from,
      subject: `${appName}: Forgot Password Request`,
      template: 'forgot-password',
      context: {
        resetCode,
        appName,
        user: authUser,
      },
    });
  }

  /**
   * #### Registration Step
   * ##### Upload Avatar
   */
  async uploadAvatar(authUser: User, file: Express.Multer.File): Promise<void> {
    await this.profilePicturesService.uploadAvatar(authUser, file);
    await this.update(authUser.id, {
      nextAction: NextActionEnum.FILL_PROFILE,
    });
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    authUser: User,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const notifications = updateUserDto.notifications && {
      notifications: updateUserDto.notifications === 'true',
    };

    const dateOfBirth = updateUserDto.dateOfBirth && {
      dateOfBirth: moment(updateUserDto.dateOfBirth, 'YYYY-MM-DD').toDate(),
    };

    await this.userRepo.save(
      this.userRepo.create({
        id: authUser.id,
        ...updateUserDto,
        ...notifications,
        ...dateOfBirth,
      }),
    );

    return this.findById(authUser.id);
  }

  /**
   * Find
   */
  find(options: FindManyOptions<User>): Promise<User[]> {
    return this.userRepo.find(options);
  }

  getManyUser(data: {
    ids: string[];
    options?: IPaginationOptions;
    alias?: string;
    select?: string[];
  }) {
    const queryBuilder = this.userRepo
      .createQueryBuilder(data.alias || 'u')
      .leftJoinAndSelect('u.profilePictures', 'pp')
      .where('u.id IN (:ids)', { ids: data.ids ?? [1] });

    if (data.select) queryBuilder.select(data.select);

    return paginate<User>(queryBuilder, data.options);
  }

  /**
   * Delete user
   */
  async deleteUser(authUser: User, user: User) {
    if (authUser.id === user.id)
      throw new BadRequestException('You cannot delete your own user');

    await this.userRepo.remove(user);
  }

  /**
   * Update/Create user
   */
  save(data: User | DeepPartial<User>): Promise<User> {
    return this.userRepo.save(data);
  }

  /**
   * Update user
   */
  update(id: number, data: QueryPartialEntity<User>) {
    return this.userRepo.update(id, data);
  }

  /**
   * Find one
   */
  findOne({
    where,
    select,
    relations = [],
  }: {
    where: FindConditions<User>;
    select?: (keyof User)[];
    relations?: any[];
  }): Promise<User> {
    return this.userRepo.findOne({ where, select, relations });
  }

  /**
   * Find one or fail
   */
  async findOneOrFail(where: DeepPartial<User>, relations = []): Promise<User> {
    try {
      return await this.userRepo.findOneOrFail({ where, relations });
    } catch (error) {
      if (error.name === 'EntityNotFoundError') {
        throw new NotFoundException('User not found!');
      }
      throw error;
    }
  }

  /**
   * Get all users
   */
  getUsers(options: IPaginationOptions): Promise<Pagination<User>> {
    const queryBuilder = this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.id', 'DESC');

    return paginate<User>(queryBuilder, options);
  }

  /**
   * Find one using username
   */
  findOneByEmail(email: string, relations = []): Promise<User> {
    return this.userRepo.findOne({
      where: {
        email,
      },
      relations,
    });
  }

  /**
   * Find by id
   */
  findById(id: number) {
    return this.userRepo.findOne(id);
  }

  /**
   * Register user
   */
  async registerUser(data: DeepPartial<User>): Promise<User> {
    const user = await this.userRepo.save(
      this.userRepo.create({
        ...data,
        requiresAction: true,
        nextAction: NextActionEnum.VERIFY_PHONE,
      }),
    );

    return user;
  }

  async checkPhoneExist(authUser: User, phoneNumber: string): Promise<boolean> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .where('u.phoneNumber =:phoneNumber', { phoneNumber })
      .andWhere('u.deactivatedAt IS NULL')
      .andWhere('u.id != :id', { id: authUser.id })
      .getOne();

    return !!user;
  }

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectAwsService(S3)
    private readonly amazonS3: S3,
    private configService: ConfigService,
    private mailerService: MailerService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private userReportService: UserReportService,
    private profilePicturesService: ProfilePicturesService,
    private fcmTokensService: FcmTokenService,
  ) {}
}
