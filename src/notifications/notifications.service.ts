import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notifications } from './notifcations.entity';
import { User } from 'src/users/user.entity';
import { Pagination, createPaginationObject } from 'nestjs-typeorm-paginate';
import { PaginationOptions } from 'src/common/pagination-options';
import { camelCase } from 'lodash';
import { plainToClass, plainToInstance } from 'class-transformer';
import { NotificationList } from './notification-list.dto';
export enum NotificationType {
  GENERAL = 'general',
  MATCH = 'match',
  LIKES = 'likes',
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notifications)
    private notificationsRepo: Repository<Notifications>,
  ) {}

  async notificationExists(
    fromUser: User,
    toUser: User,
    notificationType: NotificationType,
  ): Promise<boolean> {
    const existingNotification = await this.notificationsRepo.findOne({
      where: {
        fromUser: fromUser,
        toUser: toUser,
        notification_type: notificationType,
      },
    });
    return !!existingNotification;
  }

  async createLikesNotification(fromUser: User, toUser: User, status: string) {
    const exists = await this.notificationExists(
      fromUser,
      toUser,
      NotificationType.LIKES,
    );
    if (exists) {
      return; // Do not create a new notification if it already exists
    }
    if (status === 'SPARK LIKE') {
      return await this.notificationsRepo.save(
        this.notificationsRepo.create({
          notification_type: NotificationType.LIKES,
          notification_title: `${fromUser.firstName} has spark liked you`,
          notification_description: `Would you match now ?`,
          actions: 'View likes',
          fromUser: fromUser,
          toUser,
        }),
      );
    }
    return await this.notificationsRepo.save(
      this.notificationsRepo.create({
        notification_type: NotificationType.LIKES,
        notification_title: `${fromUser.firstName} has liked you`,
        notification_description: `Would you match now ?`,
        actions: 'View likes',
        fromUser: fromUser,
        toUser,
      }),
    );
  }

  async createMatchNotification(fromUser: User, toUser: User, status: string) {
    const exists = await this.notificationExists(
      fromUser,
      toUser,
      NotificationType.MATCH,
    );
    if (exists) {
      return; // Do not create a new notification if it already exists
    }
    return await this.notificationsRepo.save(
      this.notificationsRepo.create({
        notification_type: NotificationType.MATCH,
        notification_title: `You have matched with ${fromUser.firstName}`,
        notification_description: `It’s a match`,
        actions: 'View matches',
        fromUser: fromUser,
        toUser,
      }),
    );
  }

  async createProfileNotification(percentageOfProfile: any, toUser: User) {
    const existingNotification = await this.notificationsRepo.findOne({
      where: {
        toUser: toUser,
        notification_type: NotificationType.GENERAL,
      },
    });
    if (existingNotification) {
      await this.notificationsRepo.update(existingNotification.id, {
        notification_description: `Only ${percentageOfProfile.toFixed(
          2,
        )}% of profile is completed`,
      });
      return existingNotification;
    }
    return await this.notificationsRepo.save(
      this.notificationsRepo.create({
        notification_type: NotificationType.GENERAL,
        notification_title: `Profile Update`,
        notification_description: `Only ${percentageOfProfile.toFixed(
          2,
        )}% of profile if updated `,
        actions: 'Go to Profile',
        fromUser: null,
        toUser,
      }),
    );
  }

  async getNotifications(
    user: User,
    options: PaginationOptions & { notificationType?: NotificationType },
  ) {
    const offset = options.page * options.limit - options.limit;

    const queryBuilder = this.notificationsRepo
      .createQueryBuilder('notification')
      .where('notification.toUser = :authUserId', { authUserId: user.id })
      .leftJoinAndSelect('notification.toUser', 'user')
      .leftJoinAndSelect('notification.fromUser', 'from_user');

    // Filter by notification type if provided
    if (options.notificationType) {
      queryBuilder.andWhere(
        'notification.notification_type = :notificationType',
        {
          notificationType: options.notificationType,
        },
      );
    }

    queryBuilder.orderBy('notification.createdAt', 'ASC');

    const { value: totalItems } = await queryBuilder.connection
      .createQueryBuilder()
      .select('COUNT(*)', 'value')
      .from(`(${queryBuilder.getQuery()})`, 'uniqueTableAlias')
      .setParameters(queryBuilder.getParameters())
      .getRawOne();

    const items = await queryBuilder
      .offset(offset)
      .limit(options.limit)
      .getMany();

    console.log(items);

    // early return if no events found
    if (!items.length) {
      return createPaginationObject({
        items,
        totalItems: Number(totalItems),
        limit: options.limit,
        currentPage: options.page,
      });
    }

    return createPaginationObject({
      items: plainToInstance(NotificationList, items, {
        excludeExtraneousValues: true,
      }),
      totalItems: Number(totalItems),
      limit: options.limit,
      currentPage: options.page,
    });
  }
}
