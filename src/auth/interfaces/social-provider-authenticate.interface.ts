import { PickType } from '@nestjs/swagger';
import { User } from 'src/users/user.entity';

export class SocialProviderOutput extends PickType(User, [
  'firstName',
  'lastName',
  'socialProvider',
  'socialProviderId',
  'email',
  'emailVerifiedAt',
]) {}

export abstract class AbstractSocialProviderAuthenticate {

  private _token: string;
  private _appleClientSecret?: string;


  constructor(token: string, appleClientSecret?: string) {
    this._token = token;
    this._appleClientSecret = appleClientSecret;
  }

  protected get token(): string {
    return this._token;
  }

  protected get appleClientSecret(): string {
    return this._appleClientSecret
  }
  

  abstract validate(): Promise<SocialProviderOutput | null>;
}
