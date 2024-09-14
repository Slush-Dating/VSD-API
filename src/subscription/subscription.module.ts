import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubScription } from './subscription.entity';
import { SubscriptionService } from './subscription.service';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { SparkLikeModule } from 'src/spark/spark.module';
import { FcmTokenModule } from 'src/fcm-token/fcm-token.module';
import { OnesignalNotificationModule } from 'src/onesignal-notification/onesignal-notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubScription]),
    forwardRef(() => UsersModule),
    SparkLikeModule,
    FcmTokenModule,
    OnesignalNotificationModule,
  ],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
