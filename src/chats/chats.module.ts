import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { ChatsControllerV1 } from './controllers/chats-v1.controller';
import { ChatsService } from './chats.service';
import { Chat } from './chat.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsController } from './controllers/chats.controller';
import { ChatsGateway } from './chats.gateway';
import { FcmTokenModule } from 'src/fcm-token/fcm-token.module';
import { FixtureModule } from 'src/fixtures/fixture.module';
import { OnesignalNotificationModule } from 'src/onesignal-notification/onesignal-notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat]),
    UsersModule,
    FcmTokenModule,
    FixtureModule,
    FcmTokenModule,
    OnesignalNotificationModule,
  ],
  providers: [ChatsGateway, ChatsService],
  controllers: [ChatsControllerV1, ChatsController],
})
export class ChatsModule {}
