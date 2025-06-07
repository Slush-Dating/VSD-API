import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLogsService } from './notification-logs.service';
import { NotificationLog } from './notification-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationLog])],
  providers: [NotificationLogsService],
  exports: [NotificationLogsService],
})
export class NotificationLogsModule {}
