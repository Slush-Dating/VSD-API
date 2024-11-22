import { IsEnum, IsNotEmpty } from 'class-validator';
import { NotificationSettingType } from './notifcations.entity';

export class NotificationSettingsDto {
  @IsEnum(NotificationSettingType)
  @IsNotEmpty()
  notificationType: NotificationSettingType;
}
