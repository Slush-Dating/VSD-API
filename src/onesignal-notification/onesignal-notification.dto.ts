import { IsString, IsEnum } from 'class-validator';

export enum PlatformEnum {
  IOS = 'ios',
  ANDROID = 'android',
}

export class OnesignalNotificationDto {
  @IsString()
  message: string;
}
