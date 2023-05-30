import {
  AbstractSocialProviderAuthenticate,
  SocialProviderOutput,
} from '../interfaces/social-provider-authenticate.interface';
import { Logger } from '@nestjs/common';
import { SocialProviderTypeEnum } from '../dto/social-login.dto';
import axios from 'axios';
import { stringify } from 'querystring';
import { decode } from 'jsonwebtoken';
import * as moment from 'moment';

export class AppleSocialProvider extends AbstractSocialProviderAuthenticate {
  /**
   * Validate user
   */
  async validate(): Promise<SocialProviderOutput | null> {
    try {
      // const requestBody = `client_id=${process.env.APPLE_CLIENT_ID}&client_secret=${process.env.APPLE_CLIENT_SECRET}&grant_type=authorization_code&code=${this.token}`;

      const { data } = await axios.request({
        url: 'https://appleid.apple.com/auth/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: stringify({
          client_id: process.env.APPLE_KEYID,
          client_secret: process.env.APPLE_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: this.token,
        }),
        withCredentials: true,
      });
      console.log(`data: ${data}`)
      const payload = decode(data.id_token, { json: true });
      console.log(`payload: ${payload}`)
      if (
        payload.aud !== process.env.APPLE_CLIENTID ||
        payload.iss !== 'https://appleid.apple.com' ||
        moment.utc().unix() > payload.exp
      ) {
        return null;
      }

      return {
        socialProviderId: payload.sub,
        socialProvider: SocialProviderTypeEnum.APPLE,
        emailVerifiedAt: payload.email_verified == 'true' ? new Date() : null,
        email: payload['email'] ?? `${payload.sub}@apple.com`,
        firstName: payload?.given_name,
        lastName: payload?.family_name,
      };
    } catch (error) {
      Logger.error(
        'Login:Apple',
        JSON.stringify({
          error: error?.response?.data?.error,
          message: error?.response?.data?.error_description,
        }),
      );
      return null;
    }
  }
}