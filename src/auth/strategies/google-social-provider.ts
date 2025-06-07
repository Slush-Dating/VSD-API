import {
  AbstractSocialProviderAuthenticate,
  SocialProviderOutput,
} from '../interfaces/social-provider-authenticate.interface';
import { OAuth2Client } from 'google-auth-library';
import { Logger } from '@nestjs/common';
import { SocialProviderTypeEnum } from '../dto/social-login.dto';

export class GoogleSocialProvider extends AbstractSocialProviderAuthenticate {
  /**
   * Validate user
   */
  async validate(): Promise<SocialProviderOutput | null> {
    try {
      const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

      const data = await client.verifyIdToken({
        idToken: this.token,
        audience: [
          process.env.GOOGLE_WEB_CLIENT_ID,
          process.env.GOOGLE_ANDROID_CLIENT_ID,
          process.env.GOOGLE_IOS_CLIENT_ID,
        ],
      });

      const payload = data.getPayload();

      return {
        socialProviderId: payload['sub'],
        socialProvider: SocialProviderTypeEnum.GOOGLE,
        emailVerifiedAt: payload['email_verified'] ? new Date() : null,
        email: payload['email'],
        firstName: payload['given_name'],
        lastName: payload['family_name'],
      };
    } catch (error) {
      Logger.error(
        'Login:Google',
        JSON.stringify({
          error: error?.response?.data?.error,
          message: error?.response?.data?.error_description,
        }),
      );
      return null;
    }
  }
}
