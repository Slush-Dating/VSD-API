import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  Next,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { AccessTokenService } from 'src/access-tokens/access-tokens.service';
import { RefreshTokenService } from 'src/refresh-tokens/refresh-tokens.service';
import { CompleteRegistrationDto } from 'src/auth/dto/complete-registration.dto';
import {
  GenderEnum,
  NextActionEnum,
  RoleType,
  User,
} from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { CreateAuthTokens } from './dto/create-auth-tokens.dto';
import { RegisterDto } from './dto/register.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { SocialProviderOutput } from './interfaces/social-provider-authenticate.interface';
import { SocialProviderFactory } from './social-provider.factory';
import { randomFixedInteger } from 'src/common/helper';
import { CheckPhoneExistDto } from './dto/check-phone-exist.dto';
import { VerifyForgotPasswordDto } from './dto/verify-forgot-password.dto';
import { randomBytes } from 'crypto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { FcmTokenService } from 'src/fcm-token/fcm-token.service';
import { IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Md5 } from 'ts-md5';
import * as moment from 'moment';
import * as admin from 'firebase-admin';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mailchimp = require('@mailchimp/mailchimp_marketing');

@Injectable()
export class AuthService {
  /**
   * Reset Password
   */
  async resetPassword(data: ResetPasswordDto): Promise<void> {
    const user = await this.usersService.findOneByAttribute({
      where: {
        passwordResetToken: data.passwordResetToken,
      },
    });

    if (
      !user ||
      moment.utc().unix() > moment.utc(user.passwordResetTokenExpiresAt).unix()
    ) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.usersService.update(user.id, {
      password: await hash(data.password, 12),
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    });
  }

  /**
   * Verify Forgot Password Request
   */
  async verifyForgotPassword(data: VerifyForgotPasswordDto): Promise<string> {
    const user = await this.usersService.findOneByEmail(data.email);

    if (!user)
      throw new BadRequestException("Sorry! We couldn't find the account");

    if (
      !user.passwordResetCode ||
      !user.passwordResetCodeExpiresAt ||
      moment.utc().unix() >
        moment.utc(user.passwordResetCodeExpiresAt).unix() ||
      user.passwordResetCode !== data.passwordResetCode
    ) {
      throw new BadRequestException('Invalid or expired code');
    }

    const resetPasswordToken = randomBytes(32).toString('hex');

    await this.usersService.update(user.id, {
      passwordResetCodeExpiresAt: null,
      passwordResetCode: null,
      passwordResetToken: resetPasswordToken,
      passwordResetTokenExpiresAt: moment.utc().add(5, 'minutes').toDate(),
    });

    return resetPasswordToken;
  }

  /**
   * Forgot Password
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user)
      throw new BadRequestException("Sorry! We couldn't find the account");

    const resetCode = randomFixedInteger(6);

    this.usersService.sendForgotPasswordEmail(resetCode, user);

    await this.usersService.update(user.id, {
      passwordResetCode: resetCode,
      passwordResetCodeExpiresAt: moment.utc().add(5, 'minutes').toDate(),
    });
  }

  /**
   * Check phone number exist with another account
   */
  checkPhoneExist(authUser: User, checkPhoneExistDto: CheckPhoneExistDto) {
    return this.usersService.checkPhoneExist(
      authUser,
      checkPhoneExistDto.phoneNumber,
    );
  }

  /**
   * De-activate account
   */
  async deactivateAccount(authUser: User): Promise<void> {
    await this.usersService.deactivateAccount(authUser);
    await this.logOut(authUser);
  }

  /**
   * Complete registration
   */
  async completeRegistration(
    authUser: User,
    completeRegistrationDto: CompleteRegistrationDto,
    avatar?: Express.Multer.File,
  ): Promise<User> {
    const { action } = completeRegistrationDto;

    if (authUser.nextAction !== action) {
      throw new BadRequestException(
        `Wrong action attempted, Your next action should be '${authUser.nextAction}'`,
      );
    }

    switch (action) {
      case NextActionEnum.VERIFY_PHONE:
        await this.verifyPhoneNumber(authUser, completeRegistrationDto);
        break;

      case NextActionEnum.UPLOAD_AVATAR:
        await this.uploadAvatar(authUser, avatar);
        break;
     
        case NextActionEnum.UPLOAD_VIDEO:
        await this.uploadVideo(authUser)
        break;

      case NextActionEnum.FILL_PROFILE:
        completeRegistrationDto.avatar = avatar;
        await this.fillProfile(authUser, completeRegistrationDto);
        break;

      case NextActionEnum.FILL_ETHNICITY:
        await this.fillEthnicity(authUser, completeRegistrationDto.ethnicity);
        break;
      
      case NextActionEnum.FILL_INTERESTS:
        await this.fillInterests(authUser, completeRegistrationDto.interests);
        break;

      default:
        await this.chooseGender(authUser, completeRegistrationDto.gender);
        break;
    }

    return this.usersService.findOneOrFail({ id: authUser.id }, [
      'interests',
      'ethnicity',
      'profilePictures',
    ]);
  }

  /**
   * Fill Phone-number
   */
  async fillPhoneNumber(authUser: User, phoneNumber: string): Promise<void> {
    const checkPhoneNumber = await this.usersService.findOneByAttribute({
      where: {
        phoneNumber,
      },
    });

    if (checkPhoneNumber)
      throw new ConflictException(
        'An account already exists with this phone number',
      );

    await this.usersService.update(authUser.id, {
      phoneNumber,
      requiresAction: true,
      nextAction: NextActionEnum.VERIFY_PHONE,
    });
  }

  /**
   * Choose gender
   */
  async chooseGender(authUser: User, gender: GenderEnum): Promise<void> {
    await this.usersService.update(authUser.id, {
      gender,
      requiresAction: false,
      nextAction: NextActionEnum.NONE,
    });
  }

  /**
   * Complete profile
   */
  public async fillProfile(
    authUser: User,
    completeRegistrationDto: CompleteRegistrationDto,
  ): Promise<void> {
    const { avatar, ...data } = completeRegistrationDto;
    await this.usersService.save({
      ...data,
      id: authUser.id,
      nextAction: NextActionEnum.FILL_ETHNICITY,
      ethnicity: [],
      interests: [],
    });
  }

  public async fillEthnicity(authUser: User, ethnicityIds: number[]) {
    await this.usersService.updateEthnicity(authUser, ethnicityIds);
    await this.usersService.save({
      id: authUser.id,
      nextAction: NextActionEnum.FILL_INTERESTS,
    });
  }

  public async fillInterests(authUser: User, interestIds: number[]) {
    await this.usersService.updateInterests(authUser, interestIds);
    await this.usersService.save({
      id: authUser.id,
      nextAction: NextActionEnum.CHOOSE_GENDER,
    });
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(authUser: User, file: Express.Multer.File): Promise<void> {
    if (!file) {
      throw new BadRequestException(`The avatar field is required`);
    }

    await this.usersService.uploadAvatar(authUser, file);
  }

  /**
   * Upload video
   */
  async uploadVideo(authUser: User): Promise<void> {
    await this.usersService.save({
      id: authUser.id,
      nextAction: NextActionEnum.FILL_PROFILE,
    });
  }

  /**
   * Verify Phone Number
   */
  async verifyPhoneNumber(
    authUser: User,
    completeRegistrationDto: CompleteRegistrationDto,
  ): Promise<void> {
    const phoneNumberExist = await this.usersService.checkPhoneExist(
      authUser,
      completeRegistrationDto.phoneNumber,
    );

    if (phoneNumberExist) {
      throw new ConflictException(
        'The phone number is already associated with another account',
      );
    }

    try {
      const result = await admin
        .auth()
        .verifyIdToken(completeRegistrationDto.token, true);

      if (
        result.phone_number !==
        completeRegistrationDto.phoneNumber.replace(' ', '')
      ) {
        throw new BadRequestException('Invalid token supplied');
      }

      await this.usersService.update(authUser.id, {
        phoneNumber: completeRegistrationDto.phoneNumber,
        nextAction: NextActionEnum.UPLOAD_AVATAR,
      });
    } catch (error) {
      if (
        ['auth/user-disabled', 'auth/id-token-revoked'].includes(error.name) ||
        ['auth/argument-error'].includes(error.code)
      ) {
        throw new BadRequestException(error.message);
      }

      Logger.log(error);
      throw error;
    }
  }

  /**
   * Generate Access & Refresh Token in exchange for a Refresh Token
   */
  async createAuthTokensFromRefreshToken(
    authUser: User,
    data: CreateAuthTokens,
  ) {
    const isTokenValid = await this.refreshTokensService.validateRefreshToken(
      authUser.id,
      data.refreshToken,
    );

    if (!isTokenValid)
      throw new BadRequestException(
        'Provided token is either invalid or expired',
      );

    // revoke both tokens
    await Promise.all([
      this.accessTokensService.revokeTokenUsingRefreshToken(data.refreshToken),
      this.refreshTokensService.revokeTokenUsingRefreshToken(data.refreshToken),
    ]);

    return this.generateTokens(authUser);
  }

  /**
   * Revoke all access tokens of a user except the current token
   */
  async revokeAllTokens(authUser: User) {
    await Promise.all([
      this.accessTokensService.revokeAllTokens(authUser.id, authUser.jti),
      this.refreshTokensService.revokeAllTokens(authUser.id, authUser.jti),
    ]);
  }

  /**
   * Logout
   */
  async logOut(authUser: User): Promise<void> {
    await Promise.all([
      this.accessTokensService.revokeToken(authUser.jti),
      this.refreshTokensService.revokeTokenUsingJti(authUser.jti),
      this.fcmTokensService.deregister(authUser.id),
    ]);
  }

  /**
   * Validate user
   */
  async validateUser(username: string, password: string): Promise<User | null> {
    console.log(username);
    console.log(password);
    const user = await this.usersService.findOneByAttribute({
      where: {
        email: username,
        deactivatedAt: IsNull(),
      },
    });

    if (
      user &&
      user.role !== RoleType.ADMIN &&
      !user.socialProvider &&
      (await compare(password, user.password))
    )
      return user;
    return null;
  }

  /**
   * Validate social user
   */
  validateSocialUser(
    data: SocialLoginDto,
  ): Promise<SocialProviderOutput | null> {
    const socialProviderFactory = new SocialProviderFactory();
    const socialProvider = socialProviderFactory.make(data);
    return socialProvider.validate();
  }

  /**
   * Social Login
   */
  async socialLogin(data: SocialLoginDto) {
    const socialUser = await this.validateSocialUser(data);

    if (!socialUser) throw new UnauthorizedException();

    const user = await this.usersService.findOneByAttribute({
      where: {
        email: socialUser.email,
        role: RoleType.USER,
      },
    });

    // user already registered with normal email
    if (user && user.socialProvider === null) {
      throw new UnauthorizedException(
        'A normal account already exists with this email address',
      );
    }

    // user already registered with another social provider
    if (
      user &&
      user.socialProvider &&
      user.socialProvider !== data.socialProvider
    ) {
      throw new UnauthorizedException(
        'This email is already linked with another social provider. Try logging with different social provider.',
      );
    }

    // insert
    if (!user) {
      const newUser = await this.usersService.registerUser({
        ...socialUser,
      });
      const authenticate = await this.generateTokens(newUser);
      return { user: newUser, authenticate };
    }

    const authenticate = await this.generateTokens(user);
    return { user, authenticate };
  }

  /**
   * Register user
   */
  async registerUser(registerDto: RegisterDto) {
    const checkEmail = await this.usersService.findOneByAttribute({
      where: {
        email: registerDto.email,
        deactivatedAt: IsNull(),
      },
    });

    if (checkEmail)
      throw new ConflictException('An account with this email already exists');

    const user = await this.usersService.registerUser(registerDto);
    const authenticate = await this.generateTokens(user);

    if (registerDto.receiveOffers) {
      // subscribe to mailing list
      mailchimp.lists
        .getListMember(
          this.configService.get<string>('MAILCHIMP_CAMPAIGN_ID'),
          Md5.hashStr(registerDto.email.toLowerCase()),
        )
        .then((response: Record<string, any>) => {
          if (!response.status.includes(['subscribed', 'pending'])) {
            mailchimp.lists
              .updateListMember(
                this.configService.get<string>('MAILCHIMP_CAMPAIGN_ID'),
                Md5.hashStr(registerDto.email.toLowerCase()),
                {
                  status: 'subscribed',
                },
              )
              .then()
              .catch((e: Record<string, any>) => Logger.error(e));
          }
        })
        .catch((e: any) => {
          if (e.status === 404) {
            mailchimp.lists
              .addListMember(
                this.configService.get<string>('MAILCHIMP_CAMPAIGN_ID'),
                {
                  email_address: registerDto.email,
                  status: 'subscribed',
                },
              )
              .then()
              .catch((e: Record<string, any>) => Logger.error(e));
          } else {
            Logger.error(e);
          }
        });
    }

    return { user, authenticate };
  }

  /**
   * Generate token
   */
  async generateTokens(user: any) {
    const { decodedToken, jwtToken } =
      await this.accessTokensService.createToken(user);

    const refreshToken = await this.refreshTokensService.createToken(
      decodedToken,
    );

    return {
      accessToken: jwtToken,
      refreshToken,
      expiresAt: decodedToken['exp'],
    };
  }

  /**
   * Log out all sessions of user
   */
  async logOutAllSessionsOfUser(authUserId: number): Promise<void> {
    await this.accessTokensService.revokeAllTokens(authUserId);
    await this.refreshTokensService.revokeAllTokens(authUserId);
  }

  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private accessTokensService: AccessTokenService,
    private refreshTokensService: RefreshTokenService,
    private fcmTokensService: FcmTokenService,
    private configService: ConfigService,
  ) {}
}
