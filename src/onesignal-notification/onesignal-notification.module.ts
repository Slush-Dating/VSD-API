import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { OnesignalNotificationService } from './onesignal-notification.service';
import { OnesignalNotificationController } from './onesignal-notification.controller';

@Module({
  imports: [HttpModule],
  providers: [OnesignalNotificationService],
  controllers: [OnesignalNotificationController],
  exports: [OnesignalNotificationService],
})
export class OnesignalNotificationModule {}
