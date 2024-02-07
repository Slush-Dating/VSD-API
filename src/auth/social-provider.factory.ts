import { SocialLoginDto, SocialProviderTypeEnum } from './dto/social-login.dto';
import { AbstractSocialProviderAuthenticate } from './interfaces/social-provider-authenticate.interface';
import { AbstractSocialProviderFactory } from './interfaces/abstract-social-provider-factory';
import { GoogleSocialProvider } from './strategies/google-social-provider';
import { FacebookSocialProvider } from './strategies/facebook-social-provider';
import { AppleSocialProvider } from './strategies/apple-social-provider';

export class SocialProviderFactory extends AbstractSocialProviderFactory {
  /**
   * Create instance
   */
  make(params: SocialLoginDto): AbstractSocialProviderAuthenticate {
    console.log("PARAMS:", params)
    switch (params.socialProvider) {
      case SocialProviderTypeEnum.GOOGLE:
        return new GoogleSocialProvider(params.token);

      case SocialProviderTypeEnum.FACEBOOK:
        return new FacebookSocialProvider(params.token);

      case SocialProviderTypeEnum.APPLE:
        return new AppleSocialProvider(params.token);

      default:
        throw new Error('Invalid social provider type');
    }
  }
}
