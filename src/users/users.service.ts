import { MailerService } from '@nestjs-modules/mailer';
import { InteractDto } from 'src/video-verse/dto/interact.dto';
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
  PaginationTypeEnum,
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
  FindManyOptions,
  FindOneOptions,
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
import { Interests } from 'src/interests/interests.entity';
import { InterestsService } from 'src/interests/interests.service';
import { ProfileVideoLikesService } from 'src/profile-video-likes/profile-video-likes.service';
import { ProfileVideoLikeStatusEnum } from 'src/profile-video-likes/profile-video-like.entity';
import { Ethnicity } from 'src/ethnicity/ethnicity.entity';
import { EthnicityService } from 'src/ethnicity/ethnicity.service';

@Injectable()
export class UsersService {
  public async updateInterests(
    authUser: User,
    interestIds: number[],
  ): Promise<Interests[]> {
    const interests = await this.interestsService.findByIds(interestIds);

    authUser.interests = interests;
    await this.repository.save(authUser);

    return this.getUserInterests(authUser);
  }

  
  public async getUserInterests(authUser: User): Promise<Interests[]> {
    try {
      const user = await this.repository.findOne({
        where: { id: authUser.id },
        relations: ['interests'],
      });
      return user.interests;
    } catch (error) {
      throw error;
    }
  }

  public async updateEthnicity(
    authUser: User,
    ethnicityIds: number[],
  ): Promise<Ethnicity[]> {
    const items = await this.ethnicityService.findByIds(ethnicityIds);

    authUser.ethnicity = items;
    await this.repository.save(authUser);

    return this.getUserEthnicity(authUser);
  }

  public async getUserEthnicity(authUser: User): Promise<Ethnicity[]> {
    try {
      const user = await this.repository.findOne({
        where: { id: authUser.id },
        relations: ['ethnicity'],
      });
      return user.ethnicity;
    } catch (error) {
      throw error;
    }
  }

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

      await this.profileVideoLikeService.interactWithUser(authUser, {
        status: action as unknown as ProfileVideoLikeStatusEnum,
        user: userId,
      } as InteractDto);
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
    const user = await this.repository.findOne({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user || new Date() > user.emailVerificationTokenExpiresAt) {
      throw new NotFoundException('The link is invalid or expired');
    }

    await this.repository.update(user.id, {
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
      return await this.repository.findOneOrFail({
        where: {
          id: userId,
          role: RoleType.USER,
        },
        relations: ['profilePictures', 'interests', 'ethnicity'],
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
    await this.repository.save(authUser);
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

    const user = await this.findOneByAttribute({
      where: {
        email: newEmail,
        id: Not(authUser.id),
        deactivatedAt: IsNull(),
      },
    });

    if (user) {
      throw new ConflictException('An account already exists with this email');
    }

    const newUser = await this.repository.save(
      this.repository.create({
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

    await this.repository.update(authUser.id, {
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
    await Promise.all([
      this.profilePicturesService.uploadAvatar(authUser, file),
      this.update(authUser.id, {
        nextAction: NextActionEnum.UPLOAD_VIDEO,
      }),
    ]);
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

    // const ids = await this.ethnicityService.findByIds(updateUserDto.ethnicityIds); 
    // authUser.ethnicity = ids;
    // await this.repository.save(authUser);

    await this.repository.save(
      this.repository.create({
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
    return this.repository.find(options);
  }

  public async getManyUser(data: {
    ids: string[] | number[];
    options?: IPaginationOptions;
    alias?: string;
    select?: string[];
  }) {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder(data.alias || 'u')
        .leftJoinAndSelect('u.profilePictures', 'pp')
        .leftJoinAndSelect('u.profileVideos', 'pv')
        .leftJoinAndSelect('u.interests', 'ui')
        .leftJoinAndSelect('u.ethnicity', 'ue')
        .where('u.deactivatedAt IS NULL')
        .andWhere('u.id IN (:ids)', { ids: data.ids ?? [1] });

      if (data.select) {
        queryBuilder.select(data.select);
      }

      const totalItems = await queryBuilder.getCount();

      return await paginate<User>(queryBuilder, {
        ...data.options,
        paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
        // https://github.com/nestjsx/nestjs-typeorm-paginate/issues/627
        metaTransformer: ({ currentPage, itemCount, itemsPerPage }) => {
          const totalPages = Math.round(totalItems / itemsPerPage);
          return {
            currentPage,
            itemCount,
            itemsPerPage,
            totalItems,
            totalPages: totalPages === 0 ? 1 : totalPages,
          };
        },
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(authUser: User, user: User) {
    if (authUser.id === user.id)
      throw new BadRequestException('You cannot delete your own user');

    await this.repository.remove(user);
  }

  /**
   * Update/Create user
   */
  save(data: User | DeepPartial<User>): Promise<User> {
    return this.repository.save(data);
  }

  /**
   * Update user
   */
  update(id: number, data: QueryPartialEntity<User>) {
    return this.repository.update(id, data);
  }

  /**
   * Find one
   */
  findOneByAttribute(options: FindOneOptions<User>): Promise<User | null> {
    return this.repository.findOne(options);
  }

  /**
   * Find one or fail
   */
  async findOneOrFail(where: DeepPartial<User>, relations = []): Promise<User> {
    try {
      return await this.repository.findOneOrFail({ where, relations });
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
    const queryBuilder = this.repository
      .createQueryBuilder('user')
      .orderBy('user.id', 'DESC');

    return paginate<User>(queryBuilder, options);
  }

  /**
   * Find one using username
   */
  findOneByEmail(email: string, relations = []): Promise<User> {
    return this.repository.findOne({
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
    return this.repository.findOne(id);
  }

  /**
   * Register user
   */
  async registerUser(data: DeepPartial<User>): Promise<User> {
    const user = await this.repository.save(
      this.repository.create({
        ...data,
        requiresAction: true,
        nextAction: NextActionEnum.VERIFY_PHONE,
      }),
    );

    return user;
  }

  async checkPhoneExist(authUser: User, phoneNumber: string): Promise<boolean> {
    const user = await this.repository
      .createQueryBuilder('u')
      .where('u.phoneNumber =:phoneNumber', { phoneNumber })
      .andWhere('u.deactivatedAt IS NULL')
      .andWhere('u.id != :id', { id: authUser.id })
      .getOne();

    return !!user;
  }

  constructor(
    @InjectRepository(User) private repository: Repository<User>,
    @InjectAwsService(S3)
    private readonly amazonS3: S3,
    private configService: ConfigService,
    private mailerService: MailerService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private userReportService: UserReportService,
    private profilePicturesService: ProfilePicturesService,    
    private fcmTokensService: FcmTokenService,
    private interestsService: InterestsService,
    private profileVideoLikeService: ProfileVideoLikesService,
    private ethnicityService: EthnicityService
  ) {}
}
