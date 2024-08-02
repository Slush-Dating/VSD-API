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
  ) {}
}
