import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { getMessaging } from 'firebase-admin/messaging';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { UpdateInterestsDto } from 'src/interests/dto/update-interests.dto';
import { Interests } from 'src/interests/interests.entity';
import { InterestsService } from 'src/interests/interests.service';
import { ReportUserProfileDto } from 'src/user-report/dto/report-user-profile.dto';
import { ChangeEmailDto } from '../dto/change-email.dto';
import { MatchUnmatchDto } from '../dto/match-unmatch.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../user.entity';
import { UsersService } from '../users.service';
import { Ethnicity } from 'src/ethnicity/ethnicity.entity';
import { EthnicityService } from 'src/ethnicity/ethnicity.service';
import { UpdateEthnicityDto } from 'src/ethnicity/dto/update-ethnicity.dto';
import { NOTIFICATION } from 'src/common/constants';
import { DeleteProfileDto } from 'src/delete-profile/delete-profile.dto';
import { compare } from 'bcrypt';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { SubscriptionDto } from 'src/subscription/subscription.dto';
import { SparkLikeDto } from 'src/spark/spark.dto';
import { ViewedVideosListService } from 'src/viewed_videos/viewed-videos.service';
import { IsNotEmpty } from 'class-validator';
import { VerifyUserDto } from 'src/verification-image/VerifyUserDto.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { CancelSubscriptionDto } from 'src/subscription/cancelsubscription.dto';
@Controller({
  path: 'users',
  version: '1',
})
@ApiBearerAuth()
@ApiTags('User')
@UseGuards(JwtAuthGuard)
export class UsersControllerV1 {
  /**
   * Report user profile
   */
  @Post(':user/report')
  @ApiOperation({ summary: 'Report user profile' })
  async reportUserProfile(
    @AuthUser() authUser: User,
    @Param('user', ParseIntPipe) user: number,
    @Body() reportUserProfileDto: ReportUserProfileDto,
  ) {
    await this.usersService.reportUserProfile(
      authUser,
      user,
      reportUserProfileDto,
    );
    return { message: 'User Reported successfully!' };
  }

  /**
   * Get subscription detail
   */
  @ApiOperation({ summary: 'Get current subscription detail' })
  @Get('subscription-detail')
  public async getSubscriptionDetail(@AuthUser() authUser: User): Promise<any> {
    const item = await this.subscriptionService.getSubscriptionDetail(authUser);
    if (!item) {
      return { message: 'No subscription found!' };
    }

    return { data: item };
  }

  @ApiOperation({ summary: 'Get remaining spark' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('remain-spark')
  public async sparkCount(@AuthUser() authUser: User) {
    try {
      const sparkCount = await this.usersService.remainSpark(authUser);
      console.log(sparkCount);
      return sparkCount;
    } catch (error) {
      console.error('Error fetching spark count:', error);
      throw error; // Ensure error is properly propagated if needed
    }
  }

  /**
   * Get user profile
   */
  @Get(':user')
  @ApiOperation({ summary: 'Get user profile' })
  async getUserProfile(@Param('user', ParseIntPipe) user: number) {
    const newUser = await this.usersService.getUserProfile(user);
    return { data: newUser };
  }

  /**
   * Update user profile
   */
  // @Patch('me')
  // @ApiConsumes('multipart/form-data')
  // @ApiOperation({ summary: 'Update user profile' })
  // @UseInterceptors(AnyFilesInterceptor())
  // async updateUserProfile(
  //   @AuthUser() authUser: User,
  //   @Body() updateUserDto: UpdateUserDto,
  // ) {
  //   const user = await this.usersService.updateUserProfile(
  //     authUser,
  //     updateUserDto,
  //   );
  //   const profileCompletionPercentage = this.calculateProfileCompletion(user);
  //   await this.notificationsService.createProfileNotification(
  //     profileCompletionPercentage,
  //     user,
  //   );
  //   if (authUser.contactId) {
  //     try {
  //       const response = await lastValueFrom(
  //         this.httpService.patch(
  //           `https://api.hubapi.com/crm/v3/objects/contacts/${authUser.contactId}`,

  //           {
  //             properties: {
  //               firstname: updateUserDto.firstName
  //                 ? updateUserDto.firstName
  //                 : '',
  //               email: authUser.email,
  //               phone: updateUserDto.phoneNumber
  //                 ? updateUserDto.phoneNumber
  //                 : '',
  //               lastname: updateUserDto.lastName ? updateUserDto.lastName : '',
  //               jobtitle: updateUserDto.jobTitle ? updateUserDto.jobTitle : '',
  //               date_of_birth: updateUserDto.dateOfBirth
  //                 ? updateUserDto.dateOfBirth
  //                 : '',
  //             },
  //           },
  //           {
  //             headers: {
  //               Authorization: `Bearer pat-na1-87736912-0583-4d74-bbb5-fca8b0e1126d`,
  //             },
  //           },
  //         ),
  //       );

  //       console.log(
  //         'update API Response if contact id is avilable :',
  //         response.data,
  //       );
  //     } catch (error) {
  //       console.log('update user api', error.response.data.message);
  //     }
  //   } else {
  //     try {
  //       const response = await lastValueFrom(
  //         this.httpService.post(
  //           'https://api.hubapi.com/crm/v3/objects/contacts/search',

  //           {
  //             filterGroups: [
  //               {
  //                 filters: [
  //                   {
  //                     highValue: 'string',
  //                     propertyName: 'email',
  //                     value: authUser.email,
  //                     operator: 'EQ',
  //                   },
  //                 ],
  //               },
  //             ],
  //           },
  //           {
  //             headers: {
  //               Authorization: `Bearer pat-na1-87736912-0583-4d74-bbb5-fca8b0e1126d`,
  //             },
  //           },
  //         ),
  //       );
  //       console.log('API email filter response:', response.data.results[0]);
  //       // console.log(authUser);
  //       this.usersService.addUserContactId(authUser, response.data.results[0]);
  //       try {
  //         const updateContact = await lastValueFrom(
  //           this.httpService.patch(
  //             `https://api.hubapi.com/crm/v3/objects/contacts/${response.data.results[0].id}`,

  //             {
  //               properties: {
  //                 firstname: updateUserDto.firstName
  //                   ? updateUserDto.firstName
  //                   : '',
  //                 email: authUser.email,
  //                 phone: updateUserDto.phoneNumber
  //                   ? updateUserDto.phoneNumber
  //                   : '',
  //                 lastname: updateUserDto.lastName
  //                   ? updateUserDto.lastName
  //                   : '',
  //                 jobtitle: updateUserDto.jobTitle
  //                   ? updateUserDto.jobTitle
  //                   : '',
  //                 date_of_birth: updateUserDto.dateOfBirth
  //                   ? updateUserDto.dateOfBirth
  //                   : '',
  //               },
  //             },
  //             {
  //               headers: {
  //                 Authorization: `Bearer pat-na1-87736912-0583-4d74-bbb5-fca8b0e1126d`,
  //               },
  //             },
  //           ),
  //         );
  //         console.log(
  //           'update contact after add contact id',
  //           updateContact.data,
  //         );
  //       } catch (err) {
  //         console.log('error update contact after add contact id', err);
  //       }
  //     } catch (error) {
  //       console.log('filter user api error', error.response.data.message);
  //     }
  //   }
  //   return { data: user };
  // }

  @Patch('me')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user profile' })
  @UseInterceptors(AnyFilesInterceptor())
  async updateUserProfile(
    @AuthUser() authUser: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<{ data: User }> {
    const user = await this.usersService.updateUserProfile(
      authUser,
      updateUserDto,
    );
    const profileCompletionPercentage = this.calculateProfileCompletion(user);
    await this.notificationsService.createProfileNotification(
      profileCompletionPercentage,
      user,
    );

    if (authUser.contactId) {
      await this.updateHubspotContact(
        authUser.contactId,
        updateUserDto,
        authUser,
      );
    } else {
      await this.createOrUpdateHubspotContact(authUser, updateUserDto);
    }

    return { data: user };
  }

  private async updateHubspotContact(
    id: string,
    updateUserDto: UpdateUserDto,
    authUser: User,
  ) {
    try {
      const response = await lastValueFrom(
        this.httpService.patch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${id}`,
          {
            properties: this.getContactProperties(authUser, updateUserDto),
          },
          {
            headers: {
              Authorization: `Bearer pat-na1-87736912-0583-4d74-bbb5-fca8b0e1126d`,
            },
          },
        ),
      );
      console.log('Update API Response:', response.data);
    } catch (error) {
      console.log('Error updating user:', error.response?.data?.message);
    }
  }

  private async createOrUpdateHubspotContact(
    authUser: User,
    updateUserDto: UpdateUserDto,
  ) {
    try {
      const searchResponse = await lastValueFrom(
        this.httpService.post(
          'https://api.hubapi.com/crm/v3/objects/contacts/search',
          {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: 'email',
                    value: authUser.email,
                    operator: 'EQ',
                  },
                ],
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer pat-na1-87736912-0583-4d74-bbb5-fca8b0e1126d`,
            },
          },
        ),
      );

      const contactId = searchResponse.data.results[0];
      if (contactId) {
        await this.usersService.addUserContactId(authUser, contactId);
        await this.updateHubspotContact(contactId.id, updateUserDto, authUser);
      }
    } catch (error) {
      console.log('Error filtering user:', error.response?.data?.message);
    }
  }

  private getContactProperties(authUser: User, updateUserDto: UpdateUserDto) {
    return {
      firstname: updateUserDto.firstName ?? '',
      email: authUser.email,
      phone: updateUserDto.phoneNumber ?? '',
      lastname: updateUserDto.lastName ?? '',
      jobtitle: updateUserDto.jobTitle ?? '',
      date_of_birth: updateUserDto.dateOfBirth ?? '',
      gender: updateUserDto.gender ?? '',
      user_type: 'app',
    };
  }

  private calculateProfileCompletion(user: User): number {
    const fields = [
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'bio',
      'gender',
      'lookingFor',
      'sexuality',
      'jobTitle',
      'country',
      'city',
      'state',
      'address',
      'latitude',
      'longitude',
      'dateOfBirth',
      'height',
      'ideal_vacation',
      'distance',
      'cooking_skill',
      'smoking_opinion',
      'profilePictures',
      'profileVideos',
      'avatar',
    ];

    let completedFields = 0;
    const totalFields = fields.length;

    fields.forEach((field) => {
      if (
        user[field] !== null &&
        user[field] !== undefined &&
        user[field] !== ''
      ) {
        completedFields++;
      }
    });

    return (completedFields / totalFields) * 100;
  }

  /**
   * Send/Re-send verification email
   */
  @Post('/send-verify-email')
  @ApiOperation({ summary: 'Send/Re-send verification email' })
  async sendVerificationEmail(@AuthUser() authUser: User) {
    await this.usersService.sendVerificationEmail(authUser);
    return { message: 'Email sent successfully!' };
  }

  @Post('check/email-verified')
  @ApiOperation({
    summary: 'Check whether email is verified',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async checkEmailVerified(@AuthUser() authUser: User) {
    return {
      data: {
        verified: !!authUser.emailVerifiedAt,
      },
    };
  }

  /**
   * Change email
   */
  @Patch('/change-email')
  @ApiOperation({ summary: 'Change e-mail' })
  async changeEmail(
    @AuthUser() authUser: User,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    await this.usersService.changeEmail(authUser, changeEmailDto.email);
    return {
      message:
        'Email changed successfully. Please follow the instruction given in the email to verify your new email address.',
    };
  }

  /**
   * Match / Un-match user
   * Like or Dislike a user
   */
  @Post(':user/action')
  @ApiOperation({ summary: 'Match / Un-match ' })
  async matchUnmatchUser(
    @AuthUser() authUser: User,
    @Param('user', ParseIntPipe) user: number,
    @Body() matchUnmatchDto: MatchUnmatchDto,
  ) {
    const match = await this.usersService.matchUnmatchUser(
      authUser,
      user,
      matchUnmatchDto.action,
    );

    console.log(match);
    console.log('USER ACTION ====' + matchUnmatchDto.action);
    if (matchUnmatchDto.action == 'LIKED') {
      const receiver = await this.usersService.findOneByAttribute({
        select: ['id', 'fcmTokens', 'notifications'],
        where: { id: user },
        relations: ['fcmTokens', 'profilePictures'],
      });
      console.log(authUser.firstName + ' liked ' + receiver.firstName);
      if (receiver.isNotificationOn && receiver.rawFcmTokens.length) {
        await getMessaging().sendMulticast({
          data: {
            senderId: authUser.id.toString(),
            type: 'like',
            category: 'like',
            message: authUser.firstName + ' liked you.',
            notificationCount: '1',
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  body: authUser.firstName + ' liked you.',
                },
                category: 'like',
                badge: 1,
                sound: 'default',
                contentAvailable: true,
              },
            },
          },
          tokens: receiver.rawFcmTokens,
        });
      }
    }
    return { message: 'Success!', isMatch: match };
  }

  @Patch('interests')
  @ApiOperation({ summary: 'Update Interests' })
  public async updateInterests(
    @AuthUser() authUser: User,
    @Body() updateInterestsDto: UpdateInterestsDto,
  ): Promise<{ data: Interests[] }> {
    const interests = await this.usersService.updateInterests(
      authUser,
      updateInterestsDto.interests,
    );
    return { data: interests };
  }

  @Patch('ethnicity')
  @ApiOperation({ summary: 'Update Ethnicity' })
  public async updateEthnicity(
    @AuthUser() authUser: User,
    @Body() updateEthnicityDto: UpdateEthnicityDto,
  ): Promise<{ data: Ethnicity[] }> {
    const ethnicity = await this.usersService.updateEthnicity(
      authUser,
      updateEthnicityDto.ethnicity,
    );
    return { data: ethnicity };
  }

  @Post('delete-profile')
  @ApiOperation({ summary: 'Delete user profile' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(AnyFilesInterceptor())
  public async deleteUserProfile(
    @AuthUser() authUser: User,
    @Body() deleteUserProfileDto: DeleteProfileDto,
  ): Promise<any> {
    const passwordMatches = await compare(
      deleteUserProfileDto.password,
      authUser.password,
    );

    if (!passwordMatches) {
      throw new BadRequestException('Incorrect Password');
    }

    await this.usersService.removeUser(deleteUserProfileDto, authUser);

    return { message: 'Delete user successfully' };
  }

  @Post('change-password')
  @ApiOperation({ summary: 'change password' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(AnyFilesInterceptor())
  public async changePassword(
    @AuthUser() authUser: User,
    @Body() changePassowrdDto: ChangePasswordDto,
  ): Promise<any> {
    const passwordMatches = await compare(
      changePassowrdDto.password,
      authUser.password,
    );

    if (!passwordMatches) {
      throw new BadRequestException('Incorrect Password');
    }

    await this.usersService.changePassword(changePassowrdDto, authUser);

    return { message: 'Your password has been changed.' };
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'subscribe user' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtAuthGuard)
  public async subscribe(
    @AuthUser() authUser: User,
    @Body() subscriptionDto: SubscriptionDto,
  ): Promise<any> {
    const packageId = parseInt(subscriptionDto.packageId as any);

    if (isNaN(packageId)) {
      throw new BadRequestException(`Invalid Package ID`);
    }

    await this.usersService.subscribeUser(authUser, packageId);
    return { message: 'Subscription purchased  successfully' };
  }

  @Post('cancel-subscription')
  @ApiOperation({ summary: 'Cancel Subscription' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor())
  public async cancelSubsciption(
    @AuthUser() authUser: User,
    @Body() cancelSunscriptionDto: CancelSubscriptionDto,
  ): Promise<any> {
    const findSubscription =
      await this.subscriptionService.getSubscriptionDetail(authUser);
    if (!findSubscription) {
      return { message: 'No subscription found with this id' };
    }
    await this.subscriptionService.cancelSubscripton(
      authUser,
      findSubscription,
      cancelSunscriptionDto,
    );
    return { message: 'Cancel subscription successfully' };
  }

  @Post('update-subscription')
  @ApiOperation({ summary: 'Update Subscription' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor())
  public async updateSubsciption(
    @AuthUser() authUser: User,
    @Body() subscriptionDto: SubscriptionDto,
  ): Promise<any> {
    const packageId = parseInt(subscriptionDto.packageId as any);

    if (isNaN(packageId)) {
      throw new BadRequestException(`Invalid Package ID`);
    }

    const findSubscription =
      await this.subscriptionService.getSubscriptionDetail(authUser);
    // if (!findSubscription) {
    //   return { message: 'No subscription found with this id' };
    // }
    await this.usersService.updateSubscription(
      authUser,
      packageId,
      findSubscription,
    );
    return { message: 'Subscription updated successfully' };
  }

  @Post('spark-purchase')
  @ApiOperation({ summary: 'spark like purchase' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtAuthGuard)
  public async sparkPuchase(
    @AuthUser() authUser: User,
    @Body() sparkLikeDto: SparkLikeDto,
  ): Promise<any> {
    const spark_value = parseInt(sparkLikeDto.spark_value as any);
    const allowedSparkValues = [1, 3, 5];

    if (isNaN(spark_value) || !allowedSparkValues.includes(spark_value)) {
      throw new BadRequestException(
        `Invalid spark value. Allowed values are 1, 3, and 5.`,
      );
    }

    await this.usersService.purchaseSpark(authUser, spark_value);

    return { message: 'Spark like purchased successfully' };
  }

  /**
   * Get swipe count
   */

  @Post('swipe-count')
  @ApiOperation({ summary: 'viewed vides' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  public async viewedVideosCount(@AuthUser() authUser: User): Promise<any> {
    const swipeCount = await this.viewedVideosService.viewedVideosCount(
      authUser,
    );

    return swipeCount;
  }

  /**
   * Get user payment history
   */
  @Get('payment-history/:user')
  @ApiOperation({ summary: 'Get user payment history' })
  @ApiQuery({
    name: 'filter',
    required: false,
    example: 'Completed',
  })
  @ApiParam({ name: 'user', example: 1 })
  async getUserPaymentHistory(
    @Param('user', ParseIntPipe) user: number,
    @Query('page', new DefaultValuePipe(1)) page: number,
    @Query('limit', new DefaultValuePipe(15)) limit: number,
    @Query('filter') filter?: string,
  ) {
    const newUser = await this.usersService.getUserPaymentHistory(
      user,
      {
        page,
        limit,
      },
      filter,
    );
    return { data: newUser };
  }

  /**
   * verification-image-upload
   */
  @Post('verification-image-upload')
  @ApiOperation({ summary: 'verification-image-upload' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'verification_image', maxCount: 1 }]),
  )
  @ApiConsumes('multipart/form-data')
  public async verifyUser(
    @AuthUser() authUser: User,
    @Body() body: VerifyUserDto,
    @UploadedFiles()
    files: { verification_image?: Express.Multer.File[] },
  ): Promise<any> {
    if (!files.verification_image || files.verification_image.length === 0) {
      throw new BadRequestException(`The verification image is required`);
    }

    const verificationFile = files.verification_image[0];

    return await this.usersService.verifyUser(authUser, verificationFile);
  }

  constructor(
    private usersService: UsersService,
    private interestsService: InterestsService,
    private ethnicityService: EthnicityService,
    private viewedVideosService: ViewedVideosListService,
    private notificationsService: NotificationsService,
    private subscriptionService: SubscriptionService,
    private httpService: HttpService,
  ) {}
}
