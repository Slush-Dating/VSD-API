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
import { error } from 'console';
import { AuthService } from '../auth.service';
import { string } from 'joi';
import {AppleAuth} from 'apple-auth-ts'
import {readFileSync} from 'fs';

export class AppleSocialProvider extends AbstractSocialProviderAuthenticate {

  async validate(): Promise<SocialProviderOutput | null> {
    const configData = {
      client_id: process.env.APPLE_CLIENTID,
      team_id: process.env.APPLE_TEAMID,
      key_id: process.env.APPLE_KEYID,
      redirect_uri: process.env.APPLE_CALLBACK,
      scope: "name email"
  };
  const auth = new AppleAuth(configData, readFileSync('./secret_key/AuthKey_9U7V4744N8.p8').toString(), 'text');
try {
  const  response:any = await auth.accessToken(this.token);
  console.log("@RESP: ", response)
  const payload = decode(response.id_token, { json: true });
      console.log(`@@@ Apple payload: ${payload}`)
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
  /**
   * Validate user
   */
  async validateUser(): Promise<SocialProviderOutput | null> {
    try {
      // const requestBody = `client_id=${process.env.APPLE_CLIENT_ID}&client_secret=${process.env.APPLE_CLIENT_SECRET}&grant_type=authorization_code&code=${this.token}`;

      const { data } = await axios.request({
        url: 'https://appleid.apple.com/auth/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: stringify({
          client_id: process.env.APPLE_CLIENTID,
          client_secret: process.env.APPLE_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: this.token,
        }),
        withCredentials: true,
      });
      console.log(`@@@ Apple data: ${data}`)
      const payload = decode(data.id_token, { json: true });
      console.log(`@@@ Apple payload: ${payload}`)
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