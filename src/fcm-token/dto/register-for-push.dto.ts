import { PickType } from '@nestjs/swagger';
import { FcmToken } from '../fcm-token.entity';

export class RegisterForPushDto extends PickType(FcmToken, [
  'token',
  'deviceId',
  'deviceName',
  'playerId',
  'deviceType',
] as const) {}
