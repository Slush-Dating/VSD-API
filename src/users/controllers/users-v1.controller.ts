import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
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
    console.log("USER ACTION" + matchUnmatchDto.action)
    if(matchUnmatchDto.action == 'LIKED'){
      const receiver = await this.usersService.findOneByAttribute({
        select: ['id', 'fcmTokens', 'notifications'],
        where: { id: user },
        relations: ['fcmTokens', 'profilePictures'],
      });
      console.log(authUser.firstName + " liked " + receiver.firstName)
      if (receiver.isNotificationOn && receiver.rawFcmTokens.length) {
        await getMessaging().sendMulticast({
          notification: {
            body: authUser.firstName + " liked you.",
          },
          android: {
            notification: {
              body: authUser.firstName + " liked you.",
              notificationCount: 1,
            },
            data:{
              type: NOTIFICATION.LIKE_ACTION,
              category: "like"
            }
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
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

  constructor(
    private usersService: UsersService,
    private interestsService: InterestsService,
    private ethnicityService: EthnicityService,
  ) {}
}
