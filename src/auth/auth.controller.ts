import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { classToPlain } from 'class-transformer';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { CompleteRegistrationDto } from 'src/auth/dto/complete-registration.dto';
import { User } from 'src/users/user.entity';
import { AuthService } from './auth.service';
import { CreateAuthTokens } from './dto/create-auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { CheckPhoneExistDto } from './dto/check-phone-exist.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyForgotPasswordDto } from './dto/verify-forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ignoreElements } from 'rxjs';
import { CompleteDetailDto } from './dto/complete-detail.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { DeactivateAccountDto } from './dto/deactivate-account.dto';
import { DeactivateProfileDto } from 'src/users/dto/deactivateprofile.dto';

@Controller({
  path: 'auth',
  version: '1',
})
@ApiTags('Auth')
export class AuthControllerV1 {
  /**
   * Registration step: 1
   * Initial Registration
   */
  @Post('register')
  @ApiOperation({ summary: 'Register user' })
  async register(@Body() registerDto: RegisterDto) {
    const data = await this.authService.registerUser(registerDto);
    return {
      data: { ...classToPlain(data.user), authenticate: data.authenticate },
    };
  }

  /**
   * Complete registration
   */
  @Post('register/complete')
  @ApiOperation({ summary: 'Complete registration' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'video', maxCount: 3 },
    ]),
  )
  async completeRegistration(
    @AuthUser() authUser: User,
    @Body() completeRegistrationDto: CompleteRegistrationDto,
    @UploadedFiles()
    files: { avatar?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    if (completeRegistrationDto.action === 'upload_avatar') {
      if (!files.avatar || files.avatar.length === 0) {
        throw new BadRequestException(`The avatar field is required`);
      }
    }
    if (completeRegistrationDto.action === 'upload_video') {
      if (!files.video || files.video.length === 0) {
        throw new BadRequestException(`The video field is required`);
      }
    }

    const avatarFile = files.avatar ? files.avatar[0] : undefined;
    const videoFiles = files.video || [];

    const user = await this.authService.completeRegistration(
      authUser,
      completeRegistrationDto,
      avatarFile,
      videoFiles,
    );

    return { data: user };
  }

  /**
   * Complete detail
   */
  @Post('detail/complete')
  @ApiOperation({ summary: 'Complete Details' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtAuthGuard)
  async completeDetail(
    @AuthUser() authUser: User,
    @Body() completeDetailDto: CompleteDetailDto,
  ) {
    const user = await this.authService.completeDetail(
      authUser,
      completeDetailDto,
    );

    return { data: user };
  }

  /**
   * enable location
   */
  @Post('update/location')
  @ApiOperation({ summary: 'Update Location' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtAuthGuard)
  async updateLocation(
    @AuthUser() authUser: User,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    const { latitude, longitude } = updateLocationDto;

    if (!latitude || !longitude) {
      throw new BadRequestException(
        'latitude and longitude should not be empty',
      );
    }

    const user = await this.authService.updateLocation(
      authUser,
      latitude,
      longitude,
    );
    return { data: user };
  }

  @Post('check/phone')
  @ApiOperation({
    summary: 'Check whether phone number exist with another account',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async checkPhoneExist(
    @AuthUser() authUser: User,
    @Body() checkPhoneExistDto: CheckPhoneExistDto,
  ) {
    const exist = await this.authService.checkPhoneExist(
      authUser,
      checkPhoneExistDto,
    );
    return { data: { exist } };
  }

  /**
   * Login
   */
  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiOperation({ summary: 'Login user' })
  @ApiConsumes('application/json')
  @UseGuards(LocalAuthGuard)
  async login(@Request() req: any) {
    await this.authService.logOutAllSessionsOfUser(req.user.id);
    const authenticate = await this.authService.generateTokens(req.user);
    return { data: { ...classToPlain(req.user), authenticate } };
  }

  /**
   * Social Login
   */
  @Post('social-login')
  @ApiOperation({ summary: 'Social login' })
  async socialLogin(@Body() socialLoginDto: SocialLoginDto) {
    const data = await this.authService.socialLogin(socialLoginDto);
    return {
      data: { ...classToPlain(data.user), authenticate: data.authenticate },
    };
  }

  /**
   * Generate Access & Refresh Token in exchange for a Refresh Token
   */
  @Post('refresh-token')
  @ApiOperation({
    summary: 'Generate Access & Refresh Token in exchange for a Refresh Token',
    description:
      'Access Token is short-lived. While, Refresh Token are long-lived. So, when the Access Token is expired we generate a new pair of both tokens in exchange of a Refresh Token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createAuthTokensFromRefreshToken(
    @AuthUser() authUser: User,
    @Body() createAuthTokens: CreateAuthTokens,
  ) {
    const data = await this.authService.createAuthTokensFromRefreshToken(
      authUser,
      createAuthTokens,
    );
    return { data };
  }

  /**
   * Resend-verify-email
   */
  @Post('/send-verify-email')
  @ApiOperation({ summary: 'Send/Re-send verification email' })
  async sendVerificationEmail(
    @Body() resendmail: ForgotPasswordDto,
  ): Promise<Record<string, any>> {
    await this.authService.resendVerificationEmail(resendmail.email);
    return { message: 'New Email sent successfully!' };
  }

  /**
   * Forgot Password
   */
  @Post('forgot-password')
  @ApiOperation({ summary: 'Forgot Password' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<Record<string, any>> {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    return { message: 'Email sent!' };
  }

  @Post('verify/forgot-password')
  @ApiOperation({ summary: 'Verify Forgot Password' })
  async verifyForgotPassword(
    @Body() verifyForgotPasswordDto: VerifyForgotPasswordDto,
  ): Promise<Record<string, any>> {
    const token = await this.authService.verifyForgotPassword(
      verifyForgotPasswordDto,
    );

    return {
      data: {
        token,
      },
    };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset Password' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<Record<string, any>> {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password reset successfully' };
  }

  /**
   * De-activate account
   */
  @Post('/deactivate-account')
  @ApiOperation({ summary: 'Deactivate your account' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtAuthGuard)
  async deactivateAccount(
    @AuthUser() authUser: User,
    @Body() deactivateProfile: DeactivateProfileDto,
  ) {
    await this.authService.deactivateAccount(
      authUser,
      deactivateProfile.reason,
    );
    return { message: 'Your account has been deactivated' };
  }

  /**
   * Logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout' })
  async logOut(@AuthUser() authUser: User) {
    this.authService.logOut(authUser);
    return { message: 'User logged out successfully' };
  }

  constructor(private authService: AuthService) {}
}
