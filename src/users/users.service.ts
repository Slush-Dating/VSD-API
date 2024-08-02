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
import { HttpService } from '@nestjs/axios';
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
import {
  NextActionEnum,
  NextDetailActionEnum,
  RoleType,
  SubscriptionPurchased,
  User,
} from './user.entity';
import { InjectAwsService } from 'nest-aws-sdk';
import { Interests } from 'src/interests/interests.entity';
import { InterestsService } from 'src/interests/interests.service';
import { ProfileVideoLikesService } from 'src/profile-video-likes/profile-video-likes.service';
import { ProfileVideoLikeStatusEnum } from 'src/profile-video-likes/profile-video-like.entity';
import { Ethnicity } from 'src/ethnicity/ethnicity.entity';
import { EthnicityService } from 'src/ethnicity/ethnicity.service';
import { ProfileVideosService } from 'src/profile-videos/profile-videos.service';
import { DeleteProfileService } from 'src/delete-profile/delete-profile.service';
import { DeleteProfileDto } from 'src/delete-profile/delete-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { hash } from 'bcrypt';
import { PackagedetailService } from 'src/package-details/package-detail.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { SparkLikeService } from 'src/spark/spark.service';
import { PaymentHistoryService } from 'src/payment_history/payment_history.service';
import { VerificationImageService } from 'src/verification-image/verification-image.service';

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

  public async addReminderForLikedtab(user: User): Promise<any> {
    await this.repository.update(user.id, {
      isLikedTabUpdate: true,
    });
  }
  public async removeReminderForLikedtab(user: User): Promise<any> {
    await this.repository.update(user.id, {
      isLikedTabUpdate: false,
    });
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
      const user = await this.repository.findOneOrFail({
        where: {
          id: userId,
          role: RoleType.USER,
        },
        relations: ['profilePictures', 'interests', 'ethnicity'],
      });
      // const remainSparks = await this.sparkLikeService.remainSparks(user);
      // console.log(remainSparks);
      return user;
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
  async deactivateAccount(authUser: User, reason: string): Promise<void> {
    authUser.deactivatedAt = new Date();
    authUser.deactiveProfileReason = reason;
    await this.repository.save(authUser);
  }

  /**
   * delete user profile
   */

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
   * #### verification user account
   * ##### Upload verification image
   */

  async verifyUser(authUser: User, file: Express.Multer.File): Promise<any> {
    const findNotVerifiedUser = await this.repository.findOne({
      where: {
        id: authUser.id,
        isVerified: false,
      },
    });

    if (authUser.isVerified) {
      return {
        message: 'User already verified',
      };
    }
    if (findNotVerifiedUser) {
      await this.repository.update(findNotVerifiedUser.id, {
        isVerified: null,
      });

      return await Promise.all([
        this.verifyVideoSevice.uploadVerificationImage(authUser, file),
      ]);
    }
    return await Promise.all([
      this.verifyVideoSevice.uploadVerificationImage(authUser, file),
    ]);
  }

  // deactivate user update when login

  async updateDeactivateUser(user: User): Promise<any> {
    await this.repository.update(user.id, {
      deactivatedAt: null,
      deactiveProfileReason: null,
    });

    return await this.repository.findOne({ where: { id: user.id } });
  }

  /**
   * #### Registration Step
   * ##### Upload video
   */
  async uploadVideo(
    authUser: User,
    videos: Express.Multer.File[],
  ): Promise<void> {
    await Promise.all([
      this.profileVideosService.storeMany(authUser, videos),
      this.update(authUser.id, {
        nextAction: NextActionEnum.NONE,
      }),
    ]);
  }

  /**
   * #### Update Location
   */
  async updateLocation(
    authUser: User,
    latitude: string,
    longitude: string,
  ): Promise<void> {
    const response = await this.httpService
      .get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyABAEzRgBWl9f0AS8jN-KX8--_VwhpN-R8`,
      )
      .toPromise();

    const locationData = response.data?.results[0]?.formatted_address;

    const addressComponents = response.data.results[0]?.address_components;

    let city: string, state: string, country: string;

    for (const component of addressComponents) {
      if (component.types.includes('locality')) {
        city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        state = component.long_name;
      } else if (component.types.includes('country')) {
        country = component.long_name;
      }
    }

    await Promise.all([
      this.update(authUser.id, {
        latitude: latitude,
        longitude: longitude,
        address: locationData,
        city: city,
        state: state,
        country: country,
      }),
    ]);
  }

  /**
   * Update user profile
   */
  // async updateUserProfile(
  //   authUser: User,
  //   updateUserDto: UpdateUserDto,
  // ): Promise<User> {
  //   const notifications = updateUserDto.notifications && {
  //     notifications: updateUserDto.notifications === 'true',
  //   };

  //   const dateOfBirth = updateUserDto.dateOfBirth && {
  //     dateOfBirth: moment(updateUserDto.dateOfBirth, 'YYYY-MM-DD').toDate(),
  //   };

  //   if (!updateUserDto.height_unit) {
  //     throw new BadRequestException('Height unit is required');
  //   }
  //   if (!updateUserDto.display_height) {
  //     throw new BadRequestException('display_height is required');
  //   }

  //   if (!updateUserDto.display_gender) {
  //     throw new BadRequestException('display_gender is required');
  //   }

  //   let heightInCm: number;

  //   if (updateUserDto.height_unit && updateUserDto.height) {
  //     if (updateUserDto.height_unit?.toLowerCase() === 'ft') {
  //       const heightValue = parseFloat(updateUserDto.height);
  //       if (isNaN(heightValue)) {
  //         throw new BadRequestException('Invalid height value.');
  //       }

  //       heightInCm = heightValue * 30.48;
  //     } else if (updateUserDto.height_unit?.toLowerCase() === 'cm') {
  //       heightInCm = parseFloat(updateUserDto.height);
  //       if (isNaN(heightInCm)) {
  //         throw new BadRequestException('Invalid height value.');
  //       }
  //     } else {
  //       throw new BadRequestException(
  //         'Invalid height unit. Supported units are "ft" and "cm".',
  //       );
  //     }
  //   }

  //   const data: Partial<User> = { id: authUser.id };

  //   const userData = await this.findById(authUser.id);

  //   if (updateUserDto.height) {
  //     if (updateUserDto.display_height === 'true') {
  //       if (
  //         userData.showOnProfile?.includes('height') &&
  //         updateUserDto.display_height === 'true'
  //       ) {
  //         data.showOnProfile = `${userData.showOnProfile}`;
  //       } else {
  //         data.showOnProfile = `${
  //           userData.showOnProfile
  //             ? userData.showOnProfile + ', height'
  //             : 'height'
  //         }`;
  //       }
  //     } else if (
  //       updateUserDto.display_height === 'false' &&
  //       userData.showOnProfile?.includes('height')
  //     ) {
  //       if (
  //         userData.showOnProfile.includes('height') &&
  //         updateUserDto.display_height === 'false'
  //       ) {
  //         console.log('here include ' + userData.showOnProfile);
  //         let fields = userData.showOnProfile.split(', ');
  //         fields = fields.filter((item) => item !== 'height');
  //         data.showOnProfile = fields.join(', ');
  //       }
  //     }
  //   }

  //   if (updateUserDto.display_gender === 'true') {
  //     if (
  //       userData.showOnProfile?.includes('gender') &&
  //       updateUserDto.display_gender === 'true'
  //     ) {
  //       data.showOnProfile = `${userData.showOnProfile}`;
  //     } else {
  //       data.showOnProfile = `${
  //         userData.showOnProfile
  //           ? userData.showOnProfile + ', gender'
  //           : 'gender'
  //       }`;
  //     }
  //   } else if (
  //     updateUserDto.display_gender === 'false' &&
  //     userData.showOnProfile?.includes('gender')
  //   ) {
  //     if (
  //       userData.showOnProfile.includes('gender') &&
  //       updateUserDto.display_gender === 'false'
  //     ) {
  //       let fields = userData.showOnProfile.split(', ');
  //       fields = fields.filter((item) => item !== 'gender');
  //       data.showOnProfile = fields.join(', ');
  //     }
  //   }

  //   // const ids = await this.ethnicityService.findByIds(updateUserDto.ethnicityIds);
  //   // authUser.ethnicity = ids;
  //   // await this.repository.save(authUser);

  //   await this.repository.save(
  //     this.repository.create({
  //       id: authUser.id,
  //       ...updateUserDto,
  //       ...notifications,
  //       ...dateOfBirth,
  //       ...data,
  //       height: heightInCm?.toFixed(0).toString(),
  //     }),
  //   );

  //   return this.findById(authUser.id);
  // }

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

    if (updateUserDto.height !== undefined) {
      if (!updateUserDto.height_unit) {
        throw new BadRequestException('Height unit is required');
      }
      if (!('display_height' in updateUserDto)) {
        throw new BadRequestException('display_height is required');
      }
    }
    if (updateUserDto.gender !== undefined) {
      if (!('display_gender' in updateUserDto)) {
        throw new BadRequestException('display_gender is required');
      }
    }

    if (updateUserDto.sexuality !== undefined) {
      if (!('display_orientation' in updateUserDto)) {
        throw new BadRequestException('display_orientation is required');
      }
    }

    let heightInCm: number | undefined;
    if (updateUserDto.height && updateUserDto.height_unit) {
      heightInCm = this.calculateHeightInCm(
        updateUserDto.height,
        updateUserDto.height_unit,
      );
    }

    const userData = await this.findById(authUser.id);

    if (updateUserDto.display_height !== undefined) {
      if (updateUserDto.display_height === 'true') {
        userData.showOnProfile = this.updateShowOnProfile(
          userData.showOnProfile,
          'height',
        );
      } else {
        userData.showOnProfile = this.removeFieldFromShowOnProfile(
          userData.showOnProfile,
          'height',
        );
      }
    }

    if (updateUserDto.display_gender !== undefined) {
      if (updateUserDto.display_gender === 'true') {
        userData.showOnProfile = this.updateShowOnProfile(
          userData.showOnProfile,
          'gender',
        );
      } else {
        userData.showOnProfile = this.removeFieldFromShowOnProfile(
          userData.showOnProfile,
          'gender',
        );
      }
    }

    if (updateUserDto.display_orientation !== undefined) {
      if (updateUserDto.display_orientation === 'true') {
        userData.showOnProfile = this.updateShowOnProfile(
          userData.showOnProfile,
          'sexuality',
        );
      } else {
        userData.showOnProfile = this.removeFieldFromShowOnProfile(
          userData.showOnProfile,
          'sexuality',
        );
      }
    }

    await this.repository.save({
      id: authUser.id,
      ...updateUserDto,
      ...notifications,
      ...dateOfBirth,
      showOnProfile: userData.showOnProfile,
      height: heightInCm?.toFixed(0).toString(),
    });

    return this.findById(authUser.id);
  }

  calculateHeightInCm(height: string, unit: string): number {
    const heightValue = parseFloat(height);
    if (isNaN(heightValue)) {
      throw new BadRequestException('Invalid height value.');
    }

    if (unit.toLowerCase() === 'ft') {
      return heightValue * 30.48;
    } else if (unit.toLowerCase() === 'cm') {
      return heightValue;
    } else {
      throw new BadRequestException(
        'Invalid height unit. Supported units are "ft" and "cm".',
      );
    }
  }

  updateShowOnProfile(
    currentProfile: string | undefined,
    field: string,
  ): string {
    if (currentProfile) {
      const fields = currentProfile.split(', ');
      if (!fields.includes(field)) {
        fields.push(field);
      }
      return fields.join(', ');
    } else {
      return field;
    }
  }

  removeFieldFromShowOnProfile(
    currentProfile: string | undefined,
    field: string,
  ): string {
    if (currentProfile) {
      const fields = currentProfile.split(', ');
      const index = fields.indexOf(field);
      if (index !== -1) {
        fields.splice(index, 1);
      }
      return fields.join(', ');
    } else {
      return '';
    }
  }

  /**
   * Find
   */
  find(options: FindManyOptions<User>): Promise<User[]> {
    return this.repository.find(options);
  }

  // public async getManyUser(data: {
  //   ids: string[] | number[];
  //   options?: IPaginationOptions;
  //   alias?: string;
  //   select?: string[];
  // }) {
  //   try {
  //     const newId = data.ids.map((id) => id.userId);
  //     const ids = newId || [1];
  //     console.log(data);

  //     const idMap = new Map<number | string, number>();
  //     ids.forEach((id, index) => {
  //       idMap.set(id, index);
  //     });

  //     const isSparkLikeMap = new Map<number, boolean>();
  //     data.ids.forEach((item) => {
  //       isSparkLikeMap.set(item.userId, item.isSparkLike);
  //     });

  //     console.log(isSparkLikeMap);

  //     const queryBuilder = this.repository
  //       .createQueryBuilder(data.alias || 'u')
  //       .leftJoinAndSelect('u.profilePictures', 'pp')
  //       .leftJoinAndSelect('u.profileVideos', 'pv')
  //       .leftJoinAndSelect('u.interests', 'ui')
  //       .leftJoinAndSelect('u.ethnicity', 'ue')
  //       .where('u.deactivatedAt IS NULL')
  //       .andWhere('u.id IN (:...ids)', { ids });

  //     if (data.select) {
  //       queryBuilder.select(data.select);
  //     }

  //     const totalItems = await queryBuilder.getCount();

  //     const users = await paginate<User>(queryBuilder, {
  //       ...data.options,
  //       paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
  //       // https://github.com/nestjsx/nestjs-typeorm-paginate/issues/627
  //       metaTransformer: ({ currentPage, itemCount, itemsPerPage }) => {
  //         const totalPages = Math.round(totalItems / itemsPerPage);
  //         return {
  //           currentPage,
  //           itemCount,
  //           itemsPerPage,
  //           totalItems,
  //           totalPages: totalPages === 0 ? 1 : totalPages,
  //         };
  //       },
  //     });

  //     users.items.forEach((user) => {
  //       user.isSparkLike = isSparkLikeMap.get(user.id);
  //     });

  //     users.items.sort((a, b) => idMap.get(a.id) - idMap.get(b.id));
  //     // console.log('users.items', users);
  //     return users;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  public async getManyUser(data: {
    ids: string[] | number[];
    options?: IPaginationOptions;
    alias?: string;
    select?: string[];
  }) {
    try {
      const ids = data.ids || [1];

      const idMap = new Map<number | string, number>();
      ids.forEach((id, index) => {
        idMap.set(id, index);
      });

      const queryBuilder = this.repository
        .createQueryBuilder(data.alias || 'u')
        .leftJoinAndSelect('u.profilePictures', 'pp')
        .leftJoinAndSelect('u.profileVideos', 'pv')
        .leftJoinAndSelect('u.interests', 'ui')
        .leftJoinAndSelect('u.ethnicity', 'ue')
        .where('u.deactivatedAt IS NULL')
        .andWhere('u.id IN (:...ids)', { ids });

      if (data.select) {
        queryBuilder.select(data.select);
      }

      const totalItems = await queryBuilder.getCount();

      const users = await paginate<User>(queryBuilder, {
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

      users.items.sort((a, b) => idMap.get(a.id) - idMap.get(b.id));
      return users;
    } catch (error) {
      throw error;
    }
  }

  public async getManyUserNoSubscription(data: {
    ids: string[] | number[];
    options?: IPaginationOptions;
    alias?: string;
    select?: string[];
  }) {
    try {
      const ids = data.ids || [1];

      const idMap = new Map<number | string, number>();
      ids.forEach((id, index) => {
        idMap.set(id, index);
      });

      const queryBuilder = this.repository
        .createQueryBuilder(data.alias || 'u')
        .leftJoinAndSelect('u.profilePictures', 'pp')
        .where('u.deactivatedAt IS NULL')
        .andWhere('u.id IN (:...ids)', { ids });

      queryBuilder.select(['u.id', 'pp.key']);

      const totalItems = await queryBuilder.getCount();

      const users = await paginate<User>(queryBuilder, {
        ...data.options,
        paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
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

      users.items.sort((a, b) => idMap.get(a.id) - idMap.get(b.id));
      return users;
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
        nextAction: NextActionEnum.FILL_FIRSTNAME,
        nextDetailAction: NextDetailActionEnum.FILL_IDEAL_VACATION,
        isSubscriptionPurchased: SubscriptionPurchased.No,
      }),
    );
    this.sendVerificationEmail(user);
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

  async getUserIdByEmail(email: string): Promise<number | undefined> {
    const user = await this.repository.findOne({ where: { email } });
    return user ? user.id : undefined;
  }

  async findOneById(authUserId: number): Promise<number> {
    const findUser = await this.repository.findOne({
      where: { id: authUserId },
    });
    let totalFields = 0;
    let filledFields = 0;

    // Iterate over user object properties
    for (const key in findUser) {
      if (Object.prototype.hasOwnProperty.call(findUser, key)) {
        totalFields++;
        if (findUser[key] !== null) {
          filledFields++;
        }
      }
    }

    // Calculate percentage
    const percentage = Math.floor((filledFields / totalFields) * 100);
    return percentage;
  }

  async findUserById(authUserId: number): Promise<User> {
    const findUser = await this.repository.findOne({
      where: { id: authUserId },
    });
    return findUser;
  }

  async removeUser(
    deleteUserProfileDto: DeleteProfileDto,
    authUser: User,
  ): Promise<void> {
    const findUser = await this.repository.findOne({
      where: { id: authUser.id },
    });

    await this.deleteProfileService.addDeleteProfile(
      deleteUserProfileDto.reason,
      findUser,
    );

    await this.repository.remove(findUser);
  }

  async changePassword(
    changePasswordDto: ChangePasswordDto,
    authUser: User,
  ): Promise<void> {
    if (changePasswordDto.newpassword !== changePasswordDto.confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    await this.repository.update(authUser.id, {
      password: await hash(changePasswordDto.newpassword, 12),
    });
  }

  async subscribeUser(user: User, packageId: number): Promise<any> {
    const findUser = await this.repository.findOne(user.id);

    await this.repository.update(findUser.id, {
      isSubscriptionPurchased: SubscriptionPurchased.Yes,
    });

    const findPackage = await this.packagedetailService.findPackageById(
      packageId,
    );

    if (!findPackage) throw new BadRequestException('Package not found');

    if (!findUser) {
      throw new BadRequestException('User not found');
    }

    await this.subscriptionservice.addSubscribeUser(findUser, findPackage);
    await this.paymentHistoryService.addPaymentHistory(findUser, findPackage);
  }

  async updateSubscription(
    user: User,
    packageId: number,
    findSubscription: any,
  ): Promise<any> {
    const findUser = await this.repository.findOne(user.id);

    await this.repository.update(findUser.id, {
      isSubscriptionPurchased: SubscriptionPurchased.Yes,
    });

    const findPackage = await this.packagedetailService.findPackageById(
      packageId,
    );

    if (!findPackage) throw new BadRequestException('Package not found');

    if (!findUser) {
      throw new BadRequestException('User not found');
    }

    await this.subscriptionservice.updateSubscription(
      findUser,
      findPackage,
      findSubscription,
    );
    await this.paymentHistoryService.addPaymentHistory(findUser, findPackage);
  }

  async purchaseSpark(user: User, spark_value: number) {
    const findUser = await this.repository.findOne(user.id);

    if (!findUser) {
      throw new BadRequestException('User not found');
    }

    await this.sparkLikeService.addSparkLike(user, spark_value);
    await this.paymentHistoryService.addSparkPaymentHistory(
      findUser,
      spark_value,
    );
  }

  async getUserPaymentHistory(userId: number, option: any, status: string) {
    return this.paymentHistoryService.getPaymentHistoriesByUser(
      userId,
      option,
      status,
    );
  }

  async remainSpark(user: User) {
    console.log('here');
    return await this.sparkLikeService.remainSparks(user);
  }

  async updateUserSubcsription(userIds: any[]) {
    await this.repository.update(userIds, {
      isSubscriptionPurchased: SubscriptionPurchased.No,
    });
  }

  async addUserContactId(user: User, data: any) {
    await this.repository.update(user.id, {
      contactId: data.id,
    });
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
    private profileVideosService: ProfileVideosService,
    private fcmTokensService: FcmTokenService,
    private interestsService: InterestsService,
    private profileVideoLikeService: ProfileVideoLikesService,
    private ethnicityService: EthnicityService,
    private httpService: HttpService,
    private deleteProfileService: DeleteProfileService,
    private packagedetailService: PackagedetailService,
    private subscriptionservice: SubscriptionService,
    private sparkLikeService: SparkLikeService,
    private paymentHistoryService: PaymentHistoryService,
    private verifyVideoSevice: VerificationImageService,
  ) {}
}
