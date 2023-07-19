import { SocialLoginDto } from '../dto/social-login.dto';
import { AbstractSocialProviderAuthenticate } from './social-provider-authenticate.interface';

export abstract class AbstractSocialProviderFactory {
  abstract make(params: SocialLoginDto): AbstractSocialProviderAuthenticate;
}
