import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationLog } from './notification-log.entity';

@Injectable()
export class NotificationLogsService {
  /**
   * Save Many
   */
  async saveMany(notificationLogs: Partial<NotificationLog>[]) {
    try {
      await this.notificationLogRepo.save(notificationLogs);
    } catch (error) {
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async clearLogsOlderThanThirtyDays() {
    try {
      await this.notificationLogRepo
        .createQueryBuilder('n')
        .delete()
        .where('TIMESTAMPDIFF(DAY, NOW(), created_at) < :interval', {
          interval: -30,
        })
        .execute();
    } catch (error) {
      throw error;
    }
  }

  constructor(
    @InjectRepository(NotificationLog)
    private notificationLogRepo: Repository<NotificationLog>,
  ) {}
}
