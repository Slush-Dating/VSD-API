import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum SocialProviderTypeEnum {
  FACEBOOK = 'FACEBOOK',
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}

export class SocialLoginDto {
  @IsEnum(SocialProviderTypeEnum)
  @IsNotEmpty()
  readonly socialProvider: SocialProviderTypeEnum;

  /**
   * @example The token you get from social provider's response
   */
  @IsString()
  @IsNotEmpty()
  readonly token?: string;

}
