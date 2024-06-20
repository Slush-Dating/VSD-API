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
  @Patch('me')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user profile' })
  @UseInterceptors(AnyFilesInterceptor())
  async updateUserProfile(
    @AuthUser() authUser: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUserProfile(
      authUser,
      updateUserDto,
    );
    return { data: user };
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
    await this.usersService.matchUnmatchUser(
      authUser,
      user,
      matchUnmatchDto.action,
    );
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
    return { message: 'Success!' };
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
  ) {}
}
