import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { NotificationSettingType } from './notifcations.entity';

export class NotificationSettingsDto {
  @IsEnum(NotificationSettingType)
  @IsNotEmpty()
  notificationType: NotificationSettingType;

  @IsNumber()
  @IsNotEmpty()
  status: number;
}
