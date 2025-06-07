import { Module } from '@nestjs/common';
import { FcmTokenService } from './fcm-token.service';
import { FcmTokenControllerV1 } from './controllers/fcm-token-v1.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FcmToken } from './fcm-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FcmToken])],
  providers: [FcmTokenService],
  exports: [FcmTokenService],
  controllers: [FcmTokenControllerV1],
})
export class FcmTokenModule {}
