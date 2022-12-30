import { PickType } from '@nestjs/swagger';
import { FcmToken } from 'src/fcm-token/fcm-token.entity';

export class LogoutDto extends PickType(FcmToken, ['deviceId'] as const) {}
