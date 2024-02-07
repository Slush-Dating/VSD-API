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


  constructor(token: string) {
    this._token = token;
  }

  protected get token(): string {
    return this._token;
  }

  abstract validate(): Promise<SocialProviderOutput | null>;
}
