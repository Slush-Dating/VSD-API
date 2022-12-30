import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { ChatsControllerV1 } from './controllers/chats-v1.controller';
import { ChatsService } from './chats.service';
import { Chat } from './chat.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsController } from './controllers/chats.controller';
import { ChatsGateway } from './chats.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Chat]), UsersModule],
  providers: [ChatsGateway, ChatsService],
  controllers: [ChatsControllerV1, ChatsController],
})
export class ChatsModule {}
