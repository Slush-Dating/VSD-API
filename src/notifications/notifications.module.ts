import { forwardRef, Module } from '@nestjs/common';
import { Notifications } from './notifcations.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notifications]),
    forwardRef(() => UsersModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
