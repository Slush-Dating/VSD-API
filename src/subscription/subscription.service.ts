import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createQueryBuilder, LessThanOrEqual, Repository } from 'typeorm';
import { SubScription } from './subscription.entity';
import { Pacakagedetail } from 'src/package-details/package-detail.entity';
import { User } from 'src/users/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from 'src/users/users.service';
import { CancelSubscriptionDto } from './cancelsubscription.dto';
import { SparkLikeService } from 'src/spark/spark.service';
import { FcmTokenService } from 'src/fcm-token/fcm-token.service';
import { OnesignalNotificationService } from 'src/onesignal-notification/onesignal-notification.service';

@Injectable()
export class SubscriptionService {
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkSubscriptionDetail() {
    const currentDate = new Date();
    try {
      const subscriptions = await createQueryBuilder(SubScription, 's')
        .leftJoinAndSelect('s.user', 'u')
        .addSelect(['u.id'])
        .where('s.endsAt <= :date OR s.endsAt > :date', { date: currentDate })
        .getMany();

      // Group subscriptions by user
      const userSubscriptions = subscriptions.reduce((acc, subscription) => {
        const userId = subscription.user.id;
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push(subscription);
        return acc;
      }, {});

      const expiredUserIds = [];
      for (const userId in userSubscriptions) {
        const userSubs = userSubscriptions[userId];
        const allExpired = userSubs.every((sub) => sub.endsAt <= currentDate);
        if (allExpired) {
          expiredUserIds.push(userId);
        }
      }

      if (expiredUserIds.length > 0) {
        await this.usersService.updateUserSubcsription(expiredUserIds);
        console.log('Users with expired subscriptions:', expiredUserIds);
      }
    } catch (error) {
      console.error('Error finding users with expired subscriptions:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async checkFiverDaysBeforeOverSubscription() {
    const currentDate = new Date();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(currentDate.getDate() + 5);

    try {
      const subscriptions = await createQueryBuilder(SubScription, 's')
        .leftJoinAndSelect('s.user', 'u')
        .addSelect(['u.id'])
        .where('s.endsAt BETWEEN :currentDate AND :fiveDaysFromNow', {
          currentDate,
          fiveDaysFromNow,
        })
        .getMany();

      const userSubscriptions = subscriptions.reduce((acc, subscription) => {
        const userId = subscription.user.id;
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push(subscription);
        return acc;
      }, {});

      const userIds = [];
      for (const userId in userSubscriptions) {
        const userSubs = userSubscriptions[userId];
        const hasExpiringSoon = userSubs.some(
          (sub) => sub.endsAt >= currentDate && sub.endsAt <= fiveDaysFromNow,
        );
        if (hasExpiringSoon) {
          userIds.push(Number(userId));
        }
      }

      if (userIds.length > 0) {
        console.log(
          'Users with subscriptions expiring within 5 days:',
          userIds,
        );
        const findFcmDetails = await this.fcmTokensService.findUserDetail(
          userIds,
        );
        const androidPlayerIds: string[] = [];
        const iosPlayerIds: string[] = [];

        findFcmDetails.forEach((f) => {
          if (f.device_type.toLowerCase() === 'android') {
            androidPlayerIds.push(...f.player_ids.split(','));
          }

          if (f.device_type.toLowerCase() === 'ios') {
            iosPlayerIds.push(...f.player_ids.split(','));
          }
        });

        try {
          if (androidPlayerIds.length > 0) {
            await this.oneSignalNotificationService.sendNotificationToAndroid(
              'Your Slush subscription is expiring soon. Renew now to keep your benefits!',
              androidPlayerIds,
            );
          }

          if (iosPlayerIds.length > 0) {
            await this.oneSignalNotificationService.sendNotificationToIOS(
              'Your Slush subscription is expiring soon. Renew now to keep your benefits!',
              iosPlayerIds,
            );
          }
        } catch (error) {
          console.log(error);
        }
      }
    } catch (error) {
      console.error('Error finding users with expiring subscriptions:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async checkSubscriptionSparkUpdate() {
    const currentDate = new Date();
    try {
      const subscriptionsPackageSilver = await createQueryBuilder(
        SubScription,
        's',
      )
        .leftJoinAndSelect('s.user', 'su')
        .leftJoinAndSelect('s.package', 'sp')
        .where('s.endsAt > :currentDate', { currentDate })
        .andWhere('sp.id = :packageID', { packageID: 1 })
        .getMany();

      const subscriptionsPackageGold = await createQueryBuilder(
        SubScription,
        's',
      )
        .leftJoinAndSelect('s.user', 'su')
        .leftJoinAndSelect('s.package', 'sp')
        .where('s.endsAt > :currentDate', { currentDate })
        .andWhere('sp.id = :packageID', { packageID: 2 })
        .getMany();
      const subscriptionsPackagePremium = await createQueryBuilder(
        SubScription,
        's',
      )
        .leftJoinAndSelect('s.user', 'su')
        .leftJoinAndSelect('s.package', 'sp')
        .where('s.endsAt > :currentDate', { currentDate })
        .andWhere('sp.id = :packageID', { packageID: 3 })
        .getMany();

      const userUpdateSilverPackage = subscriptionsPackageSilver.map(
        (value) => value.user.id,
      );

      const userUpdateGoldPackage = subscriptionsPackageGold.map(
        (item) => item.user.id,
      );

      const userUpdatePremiumPackage = subscriptionsPackagePremium.map(
        (item) => item.user.id,
      );
      if (userUpdateSilverPackage.length > 0) {
        this.sparkLikeService.updateSparkEveryDay(userUpdateSilverPackage, 1);
      }

      if (userUpdateGoldPackage.length > 0) {
        this.sparkLikeService.updateSparkEveryDay(userUpdateGoldPackage, 5);
      }
      if (userUpdatePremiumPackage.length > 0) {
        this.sparkLikeService.updateSparkEveryDay(userUpdatePremiumPackage, 10);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async addSubscribeUser(user: User, package_detail: Pacakagedetail) {
    const findUser = await this.subscriptionRepo.findOne({
      where: { user: user },
    });

    if (findUser) {
      throw new BadRequestException(`User already purchased subscription plan`);
    }

    const startTime = new Date();
    const endTime = new Date(
      startTime.getTime() +
        package_detail.duration_of_plan * 24 * 60 * 60 * 1000,
    );

    const subscriber = this.subscriptionRepo.create({
      user: user,
      package: package_detail,
      startsAt: startTime,
      endsAt: endTime,
    });

    await this.subscriptionRepo.save(subscriber);
  }

  async updateSubscription(
    user: User,
    package_detail: Pacakagedetail,
    findSubscription: any,
  ) {
    if (findSubscription) {
      const currentDate = new Date();
      await this.subscriptionRepo.update(findSubscription.id, {
        endsAt: currentDate,
      });
      const startTime = new Date();
      const endTime = new Date(
        startTime.getTime() +
          package_detail.duration_of_plan * 24 * 60 * 60 * 1000,
      );

      const subscriber = this.subscriptionRepo.create({
        user: user,
        package: package_detail,
        startsAt: startTime,
        endsAt: endTime,
      });

      await this.subscriptionRepo.save(subscriber);
    } else {
      throw new BadRequestException(
        `Subscription not found for ${user.firstName}`,
      );
    }
  }

  async cancelSubscripton(
    user: User,
    subscriptionDetail: any,
    cancelSunscriptionDto: CancelSubscriptionDto,
  ) {
    const currentDate = new Date();
    // console.log(subscriptionDetail);
    await this.subscriptionRepo.update(subscriptionDetail.id, {
      endsAt: currentDate,
      remark: cancelSunscriptionDto.remark,
    });
  }

  async getSubscriptionDetail(user: User) {
    const queryBuilder = this.subscriptionRepo
      .createQueryBuilder('subscription')
      .where('subscription.user = :authUserId', { authUserId: user.id })
      .andWhere('subscription.endsAt > :now', { now: new Date() })
      .leftJoinAndSelect('subscription.package', 'package')
      .orderBy('subscription.startsAt', 'DESC');

    const items = await queryBuilder.getOne();

    return items;
  }

  constructor(
    @InjectRepository(SubScription)
    private subscriptionRepo: Repository<SubScription>,
    @Inject(forwardRef(() => UsersService)) // Use forwardRef here
    private readonly usersService: UsersService,
    private sparkLikeService: SparkLikeService,
    private fcmTokensService: FcmTokenService,
    private oneSignalNotificationService: OnesignalNotificationService,
  ) {}
}
