import {
  AbstractSocialProviderAuthenticate,
  SocialProviderOutput,
} from '../interfaces/social-provider-authenticate.interface';
import axios from 'axios';
import { Logger } from '@nestjs/common';
import { SocialProviderTypeEnum } from '../dto/social-login.dto';
import * as moment from 'moment';

export class FacebookSocialProvider extends AbstractSocialProviderAuthenticate {
  /**
   * Validate user
   */
  async validate(): Promise<SocialProviderOutput | null> {
    try {
      const baseUrl = 'https://graph.facebook.com/v12.0';

      // Step 1: Obtain user access token
      const userAccessToken = this.token;

      // Step 2: Obtain app access token
      const {
        data: { access_token: appAccessToken },
      } = await axios.get(baseUrl + '/oauth/access_token', {
        headers: {
          accept: 'application/json',
        },
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_SECRET,
          grant_type: 'client_credentials',
        },
      });

      // Step 3: Debug token
      const {
        data: { data: token },
      } = await axios.get(baseUrl + '/debug_token', {
        headers: {
          accept: 'application/json',
        },
        params: {
          input_token: userAccessToken,
          access_token: appAccessToken,
        },
      });

      // Validate
      if (
        !token.is_valid ||
        moment.utc().unix() > token.expires_at ||
        token.app_id !== process.env.FACEBOOK_APP_ID
      ) {
        return null;
      }

      // Step 4: Obtain user details
      const { data } = await axios.get(baseUrl + '/me', {
        headers: {
          accept: 'application/json',
        },
        params: {
          access_token: userAccessToken,
          fields: ['email', 'first_name', 'last_name'].toString(),
        },
      });

      return {
        socialProviderId: data['id'],
        socialProvider: SocialProviderTypeEnum.FACEBOOK,
        email: data['email'] ?? `${data['id']}@facebook.com`,
        emailVerifiedAt: data['email'] ? new Date() : null,
        firstName: data['first_name'],
        lastName: data['last_name'],
      };
    } catch (error) {
      Logger.error(
        'Login:Facebook',
        JSON.stringify({
          error: error?.request?._header,
          message: error?.response?.data?.error?.message,
        }),
      );
      return null;
    }
  }
}
