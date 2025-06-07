import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AppVersionTypeEnum } from '../app-version.entity';

export class CheckAppVersionDto {
  /**
   * The current app version
   * @example 0.0.1
   */
  @IsString()
  @IsNotEmpty()
  readonly currentVersion: string;

  /**
   * Type = Operation System Name
   */
  @IsEnum(AppVersionTypeEnum)
  @IsNotEmpty()
  readonly type: AppVersionTypeEnum;
}
