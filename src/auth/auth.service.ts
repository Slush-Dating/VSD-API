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
import { HttpService } from '@nestjs/axios';
import { compare, hash } from 'bcrypt';
import { AccessTokenService } from 'src/access-tokens/access-tokens.service';
import { RefreshTokenService } from 'src/refresh-tokens/refresh-tokens.service';
import { CompleteRegistrationDto } from 'src/auth/dto/complete-registration.dto';
import {
  CookingSkillEnum,
  GenderEnum,
  IdealVacationEnum,
  LookingForEnum,
  NextActionEnum,
  NextDetailActionEnum,
  RoleType,
  SexualityEnum,
  SmokingOpinionEnum,
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
import { check } from 'prettier';
import { validate } from 'class-validator';
import { CompleteDetailDto } from './dto/complete-detail.dto';
import { getMessaging } from 'firebase-admin/messaging';
import { lastValueFrom } from 'rxjs';

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
   * resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user)
      throw new BadRequestException("Sorry! We couldn't find the account");

    this.usersService.sendVerificationEmail(user);
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
  async deactivateAccount(authUser: User, reason: string): Promise<void> {
    await this.usersService.deactivateAccount(authUser, reason);
    await this.logOut(authUser);
  }

  /**
   * Complete registration
   */
  async completeRegistration(
    authUser: User,
    completeRegistrationDto: CompleteRegistrationDto,
    avatar?: Express.Multer.File,
    video?: Express.Multer.File[],
  ): Promise<User> {
    const { action } = completeRegistrationDto;

    // if (authUser.nextAction !== action) {
    //   throw new BadRequestException(
    //     `Wrong action attempted, Your next action should be '${authUser.nextAction}'`,
    //   );
    // }

    switch (action) {
      // case NextActionEnum.VERIFY_PHONE:
      //   await this.verifyPhoneNumber(authUser, completeRegistrationDto);
      //   break;

      case NextActionEnum.FILL_FIRSTNAME:
        await this.fillFirstName(authUser, completeRegistrationDto.firstName);
        break;

      case NextActionEnum.FILL_DATEOFBIRTH:
        await this.fillDateOfBirth(
          authUser,
          completeRegistrationDto.dateOfBirth,
        );
        break;

      case NextActionEnum.FILL_HEIGHT:
        await this.fillHeight(
          authUser,
          completeRegistrationDto.height,
          completeRegistrationDto.height_unit,
          completeRegistrationDto.displayOnProfile,
        );
        break;

      case NextActionEnum.CHOOSE_GENDER: {
        await this.chooseGender(
          authUser,
          completeRegistrationDto.gender,
          completeRegistrationDto.displayOnProfile,
        );
        break;
      }
      case NextActionEnum.FILL_LOOKINGFOR: {
        await this.fillLookingfor(
          authUser,
          completeRegistrationDto.lookingFor,
          completeRegistrationDto.displayOnProfile,
        );
        break;
      }

      case NextActionEnum.FILL_SEXUAL_ORIENTATION: {
        await this.fillSexualOrientation(
          authUser,
          completeRegistrationDto.sexuality,
          completeRegistrationDto.displayOnProfile,
        );
        break;
      }

      case NextActionEnum.FILL_ETHNICITY:
        await this.fillEthnicity(authUser, completeRegistrationDto.ethnicity);
        break;

      case NextActionEnum.UPLOAD_AVATAR:
        await this.uploadAvatar(authUser, avatar);
        break;

      default:
        await this.uploadVideo(authUser, video);
        break;
    }

    return this.usersService.findOneOrFail({ id: authUser.id }, [
      'interests',
      'ethnicity',
      'profilePictures',
      'profileVideos',
    ]);
  }

  /* 
  Complete detail
  */
  async completeDetail(
    authUser: User,
    completeDetailDto: CompleteDetailDto,
  ): Promise<User> {
    const { action } = completeDetailDto;

    if (authUser.nextDetailAction !== action) {
      throw new BadRequestException(
        `Wrong action attempted, Your next detail action should be '${authUser.nextDetailAction}'`,
      );
    }

    switch (action) {
      case NextDetailActionEnum.FILL_IDEAL_VACATION:
        await this.fillIdealVacation(
          authUser,
          completeDetailDto.ideal_vacation,
        );
        break;

      case NextDetailActionEnum.FILL_DISTANCE:
        await this.fillDistance(authUser, completeDetailDto.distance);
        break;

      case NextDetailActionEnum.FILL_COOKING_SKILL:
        await this.fillCooking(authUser, completeDetailDto.cooking_skill);
        break;

      case NextDetailActionEnum.FILL_OPINION_SMOKING: {
        await this.fillSmokingOpinion(
          authUser,
          completeDetailDto.smoking_opinion,
        );
        break;
      }

      default:
        await this.fillSmokingOpinion(
          authUser,
          completeDetailDto.smoking_opinion,
        );
        break;
    }

    return this.usersService.findOneOrFail({ id: authUser.id }, []);
  }

  /* 
  update location
  */
  async updateLocation(authUser: User, latitude: string, longitude: string) {
    await this.usersService.updateLocation(authUser, latitude, longitude);
    return this.usersService.findOneOrFail({ id: authUser.id }, [
      'interests',
      'ethnicity',
      'profilePictures',
      'profileVideos',
    ]);
  }

  /**
   * Fill Phone-number
   */
  // async fillPhoneNumber(authUser: User, phoneNumber: string): Promise<void> {
  //   const checkPhoneNumber = await this.usersService.findOneByAttribute({
  //     where: {
  //       phoneNumber,
  //     },
  //   });

  //   if (checkPhoneNumber)
  //     throw new ConflictException(
  //       'An account already exists with this phone number',
  //     );

  //   await this.usersService.update(authUser.id, {
  //     phoneNumber,
  //     requiresAction: true,
  //     nextAction: NextActionEnum.VERIFY_PHONE,
  //   });
  // }

  /**
   * Complete profile
   */

  public async fillFirstName(authUser: User, firstName: string) {
    try {
      const response = await lastValueFrom(
        this.httpService.post(
          'https://api.hubapi.com/crm/v3/objects/contacts',

          {
            associations: [],
            properties: {
              email: authUser.email,
              firstname: firstName,
            },
          },
          {
            headers: {
              Authorization: `Bearer pat-na1-87736912-0583-4d74-bbb5-fca8b0e1126d`,
            },
          },
        ),
      );

      console.log('API response:', response.data);
      this.usersService.addUserContactId(authUser, response.data);
    } catch (error) {
      console.error(
        'Error calling the external API:',
        error.response.data.message,
      );
      try {
        const response = await lastValueFrom(
          this.httpService.patch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${authUser.contactId}`,

            {
              properties: {
                email: authUser.email,
                firstname: authUser.firstName,
              },
            },
            {
              headers: {
                Authorization: `Bearer pat-na1-87736912-0583-4d74-bbb5-fca8b0e1126d`,
              },
            },
          ),
        );

        console.log('update API Response:', response.data);
      } catch (error) {
        console.error(
          'Error calling the external API:',
          error.response.data.message,
        );
      }

      // throw new BadRequestException('Failed to call the external API.');
    }

    await this.usersService.save({
      id: authUser.id,
      firstName: firstName,
      nextAction: NextActionEnum.FILL_DATEOFBIRTH,
    });
  }

  public async fillDateOfBirth(authUser: User, dateOfBirth: string) {
    await this.usersService.save({
      id: authUser.id,
      dateOfBirth: dateOfBirth,
      nextAction: NextActionEnum.FILL_HEIGHT,
    });

    try {
      const response = await lastValueFrom(
        this.httpService.patch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${authUser.contactId}`,

          {
            properties: {
              date_of_birth: dateOfBirth,
            },
          },
          {
            headers: {
              Authorization: `Bearer pat-na1-87736912-0583-4d74-bbb5-fca8b0e1126d`,
            },
          },
        ),
      );

      console.log('update API Response:', response.data);
    } catch (error) {
      console.error(
        'Error calling the external update API:',
        error.response.data.message,
      );
    }
  }

  public async fillHeight(
    authUser: User,
    heightDto: string,
    heightUnit: string,
    displayOnProfile: string,
  ) {
    let heightInCm: number;

    if (heightUnit && heightDto) {
      if (heightUnit?.toLowerCase() === 'ft') {
        const heightValue = parseFloat(heightDto);
        if (isNaN(heightValue)) {
          throw new BadRequestException('Invalid height value.');
        }

        heightInCm = heightValue * 30.48;
      } else if (heightUnit?.toLowerCase() === 'cm') {
        heightInCm = parseFloat(heightDto);
        if (isNaN(heightInCm)) {
          throw new BadRequestException('Invalid height value.');
        }
      } else {
        throw new BadRequestException(
          'Invalid height unit. Supported units are "ft" and "cm".',
        );
      }
    }

    const data: Partial<User> = { id: authUser.id };

    const userData = await this.usersService.findById(authUser.id);
    if (displayOnProfile === 'true') {
      if (
        userData.showOnProfile?.includes('height') &&
        displayOnProfile === 'true'
      ) {
        data.showOnProfile = `${userData.showOnProfile}`;
      } else {
        data.showOnProfile = `${
          userData.showOnProfile
            ? userData.showOnProfile + ', height'
            : 'height'
        }`;
      }
    } else if (
      displayOnProfile === 'false' &&
      userData.showOnProfile?.includes('height')
    ) {
      if (
        userData.showOnProfile.includes('height') &&
        displayOnProfile === 'false'
      ) {
        let fields = userData.showOnProfile.split(', ');
        fields = fields.filter((item) => item !== 'height');
        data.showOnProfile = fields.join(', ');
      }
    }
    await this.usersService.save({
      height: heightInCm?.toFixed(0).toString(),
      ...data,
      nextAction: NextActionEnum.CHOOSE_GENDER,
    });

    // await this.usersService.save({
    //   height: heightDto,
    //   id: authUser.id,
    //   nextAction: NextActionEnum.FILL_ETHNICITY,
    // });
  }

  /**
   * Choose gender
   */
  async chooseGender(
    authUser: User,
    gender: GenderEnum,
    displayOnProfile: string,
  ): Promise<void> {
    const data: Partial<User> = { id: authUser.id };

    const userData = await this.usersService.findById(authUser.id);
    if (displayOnProfile === 'true') {
      if (
        userData.showOnProfile?.includes('gender') &&
        displayOnProfile === 'true'
      ) {
        data.showOnProfile = `${userData.showOnProfile}`;
      } else {
        data.showOnProfile = `${
          userData.showOnProfile
            ? userData.showOnProfile + ', gender'
            : 'gender'
        }`;
      }
    } else if (
      displayOnProfile === 'false' &&
      userData.showOnProfile?.includes('gender')
    ) {
      if (
        userData.showOnProfile.includes('gender') &&
        displayOnProfile === 'false'
      ) {
        let fields = userData.showOnProfile.split(', ');
        fields = fields.filter((item) => item !== 'gender');
        data.showOnProfile = fields.join(', ');
      }
    }
    await this.usersService.update(authUser.id, {
      gender,
      ...data,
      // requiresAction: false,
      nextAction: NextActionEnum.FILL_LOOKINGFOR,
    });

    try {
      const response = await lastValueFrom(
        this.httpService.patch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${authUser.contactId}`,

          {
            properties: {
              gender,
            },
          },
          {
            headers: {
              Authorization: `Bearer pat-na1-87736912-0583-4d74-bbb5-fca8b0e1126d`,
            },
          },
        ),
      );

      console.log('update API Response:', response.data);
    } catch (error) {
      console.error(
        'Error calling the external update API:',
        error.response.data.message,
      );
    }
  }

  /**
   * Choose Looking for
   */
  async fillLookingfor(
    authUser: User,
    lookingFor: LookingForEnum,
    displayOnProfile: string,
  ): Promise<void> {
    const data: Partial<User> = { id: authUser.id };

    const userData = await this.usersService.findById(authUser.id);

    if (displayOnProfile === 'true') {
      if (
        userData.showOnProfile.includes('lookingFor') &&
        displayOnProfile === 'true'
      ) {
        data.showOnProfile = `${userData.showOnProfile}`;
      } else {
        data.showOnProfile = `${
          userData.showOnProfile
            ? userData.showOnProfile + ', lookingFor'
            : 'lookingFor'
        }`;
      }
    } else if (
      displayOnProfile === 'false' &&
      userData.showOnProfile?.includes('lookingFor')
    ) {
      if (
        userData.showOnProfile.includes('lookingFor') &&
        displayOnProfile === 'false'
      ) {
        let fields = userData.showOnProfile.split(', ');
        fields = fields.filter((item) => item !== 'lookingFor');
        data.showOnProfile = fields.join(', ');
      }
    }

    await this.usersService.update(authUser.id, {
      lookingFor,
      ...data,
      nextAction: NextActionEnum.FILL_SEXUAL_ORIENTATION,
    });
  }

  /**
   * Fill Sexual orientation
   */
  async fillSexualOrientation(
    authUser: User,
    sexuality: SexualityEnum,
    displayOnProfile: string,
  ): Promise<void> {
    const data: Partial<User> = { id: authUser.id };

    const userData = await this.usersService.findById(authUser.id);

    if (displayOnProfile === 'true') {
      if (
        userData.showOnProfile.includes('sexuality') &&
        displayOnProfile === 'true'
      ) {
        data.showOnProfile = `${userData.showOnProfile}`;
      } else {
        data.showOnProfile = `${
          userData.showOnProfile
            ? userData.showOnProfile + ', sexuality'
            : 'sexuality'
        }`;
      }
    } else if (
      displayOnProfile === 'false' &&
      userData.showOnProfile?.includes('sexuality')
    ) {
      if (
        userData.showOnProfile.includes('sexuality') &&
        displayOnProfile === 'false'
      ) {
        let fields = userData.showOnProfile.split(', ');
        fields = fields.filter((item) => item !== 'sexuality');
        data.showOnProfile = fields.join(', ');
      }
    }

    await this.usersService.update(authUser.id, {
      sexuality,
      ...data,
      nextAction: NextActionEnum.FILL_ETHNICITY,
    });
  }

  public async fillEthnicity(authUser: User, ethnicityIds: number[]) {
    await this.usersService.updateEthnicity(authUser, ethnicityIds);
    await this.usersService.save({
      id: authUser.id,
      nextAction: NextActionEnum.UPLOAD_AVATAR,
    });
  }

  // fill location

  public async fillLocation(
    authUser: User,
    address: string,
    latitude: string,
    longitude: string,
  ) {
    await this.usersService.save({
      id: authUser.id,
      address: address,
      latitude: latitude,
      longitude: longitude,
      nextAction: NextActionEnum.UPLOAD_AVATAR,
    });
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(authUser: User, file: Express.Multer.File): Promise<void> {
    await this.usersService.uploadAvatar(authUser, file);
  }

  /**
   * Upload video
   */
  async uploadVideo(
    authUser: User,
    video: Express.Multer.File[],
  ): Promise<void> {
    await this.usersService.uploadVideo(authUser, video);
  }

  /**
   * Enhance security
   */
  async fillPassword(
    authUser: User,
    password: string,
    confirm_password: string,
  ): Promise<void> {
    if (password !== confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    await this.usersService.save({
      id: authUser.id,
      password: await hash(password, 12),
      requiresAction: false,
      nextAction: NextActionEnum.NONE,
    });
  }

  public async fillProfile(
    authUser: User,
    completeRegistrationDto: CompleteRegistrationDto,
    displayOnProfile: string,
  ): Promise<void> {
    const data: Partial<User> = { id: authUser.id };

    const userData = await this.usersService.findById(authUser.id);

    if (
      userData.showOnProfile &&
      userData.showOnProfile?.includes('dateOfBirth') &&
      displayOnProfile
    ) {
      data.showOnProfile = `${userData.showOnProfile}`;
    } else if (displayOnProfile) {
      data.showOnProfile = `${
        userData.showOnProfile
          ? userData.showOnProfile + ',dateOfBirth'
          : 'dateOfBirth'
      }`;
    }

    await this.usersService.save({
      ...data,
      id: authUser.id,
      nextAction: NextActionEnum.FILL_FIRSTNAME,
      ethnicity: [],
      interests: [],
    });
  }

  public async fillInterests(authUser: User, interestIds: number[]) {
    await this.usersService.updateInterests(authUser, interestIds);
    await this.usersService.save({
      id: authUser.id,
      // nextAction: NextActionEnum.CHOOSE_GENDER,
    });
  }

  /**
   * fill ideal vacation
   */

  public async fillIdealVacation(
    authUser: User,
    ideal_vacation: IdealVacationEnum,
  ) {
    await this.usersService.save({
      id: authUser.id,
      ideal_vacation: ideal_vacation,
      nextDetailAction: NextDetailActionEnum.FILL_DISTANCE,
    });
  }

  /**
   * fill distance
   */

  public async fillDistance(authUser: User, distance: number) {
    await this.usersService.save({
      id: authUser.id,
      distance: distance,
      nextDetailAction: NextDetailActionEnum.FILL_COOKING_SKILL,
    });
  }

  /**
   * fill cooking skill
   */

  public async fillCooking(authUser: User, cooking_skill: CookingSkillEnum) {
    await this.usersService.save({
      id: authUser.id,
      cooking_skill: cooking_skill,
      nextDetailAction: NextDetailActionEnum.FILL_OPINION_SMOKING,
    });
  }

  /**
   * fill smoking skill
   */

  public async fillSmokingOpinion(
    authUser: User,
    smoking_opinion: SmokingOpinionEnum,
  ) {
    await this.usersService.save({
      id: authUser.id,
      smoking_opinion: smoking_opinion,
      nextDetailAction: NextDetailActionEnum.NONE,
    });
  }

  /**
   * Verify Phone Number
   */
  // async verifyPhoneNumber(
  //   authUser: User,
  //   completeRegistrationDto: CompleteRegistrationDto,
  // ): Promise<void> {
  //   const phoneNumberExist = await this.usersService.checkPhoneExist(
  //     authUser,
  //     completeRegistrationDto.phoneNumber,
  //   );

  //   if (phoneNumberExist) {
  //     throw new ConflictException(
  //       'The phone number is already associated with another account',
  //     );
  //   }

  //   try {
  //     const result = await admin
  //       .auth()
  //       .verifyIdToken(completeRegistrationDto.token, true);

  //     if (
  //       result.phone_number !==
  //       completeRegistrationDto.phoneNumber.replace(' ', '')
  //     ) {
  //       throw new BadRequestException('Invalid token supplied');
  //     }

  //     await this.usersService.update(authUser.id, {
  //       phoneNumber: completeRegistrationDto.phoneNumber,
  //       nextAction: NextActionEnum.UPLOAD_AVATAR,
  //     });
  //   } catch (error) {
  //     if (
  //       ['auth/user-disabled', 'auth/id-token-revoked'].includes(error.name) ||
  //       ['auth/argument-error'].includes(error.code)
  //     ) {
  //       throw new BadRequestException(error.message);
  //     }

  //     Logger.log(error);
  //     throw error;
  //   }
  // }

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
    const user = await this.usersService.findOneByAttribute({
      where: {
        email: username,
        // deactivatedAt: IsNull(),
      },
    });

    if (
      user &&
      user.role !== RoleType.ADMIN &&
      !user.socialProvider &&
      (await compare(password, user.password))
    ) {
      if (user.isDeactivated) {
        return await this.usersService.updateDeactivateUser(user);
      } else {
        return user;
      }
    }
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
    console.log('@ SOCIAL LOGIN DATA:', data);
    const socialUser = await this.validateSocialUser(data);
    console.log('@ SOCIAL USER:', socialUser);
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
    const percentage = await this.getProfilePercentage(authUserId);
    const user = await this.usersService.findUserById(authUserId);

    await this.sendProfilePercentageNotification(user, percentage);
  }

  // get filled profile percent

  async getProfilePercentage(authUserId: number) {
    const findUser = await this.usersService.findOneById(authUserId);
    return findUser;
  }

  async sendProfilePercentageNotification(
    authUser: User,
    profilePercentage: number,
  ) {
    const receiver = await this.usersService.findOneByAttribute({
      select: ['id', 'fcmTokens', 'notifications'],
      where: { id: authUser.id },
      relations: ['fcmTokens', 'profilePictures'],
    });

    if (receiver.isNotificationOn && receiver.rawFcmTokens.length) {
      await getMessaging().sendMulticast({
        data: {
          senderId: authUser.id.toString(),
          type: 'profile_percentage',
          message: `Your profile is ${profilePercentage}% complete!`,
          notificationCount: '1',
        },
        apns: {
          payload: {
            aps: {
              alert: {
                body: `Your profile is ${profilePercentage}% complete!`,
              },
              badge: 1,
              sound: 'default',
              contentAvailable: true,
            },
          },
        },
        tokens: receiver.rawFcmTokens,
      });
      console.log('Profile percentage notification sent');
    }
  }

  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private accessTokensService: AccessTokenService,
    private refreshTokensService: RefreshTokenService,
    private fcmTokensService: FcmTokenService,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}
}

export const convertHeightToCm = (height: string): number => {
  const heightParts = height.split(' ');
  const heightValue = parseFloat(heightParts[0]);
  const unit = heightParts[1];
  console.log(heightValue);
  console.log(unit);

  // Convert height to centimeters
  switch (unit) {
    case 'cm':
      return heightValue;
    case 'ft':
      // Assuming 1 foot = 30.48 cm
      return heightValue * 30.48;
    default:
      throw new Error('Invalid height unit');
  }
};
