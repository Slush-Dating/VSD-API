import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubScription } from './subscription.entity';
import { Pacakagedetail } from 'src/package-details/package-detail.entity';
import { User } from 'src/users/user.entity';

@Injectable()
export class SubscriptionService {
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
  ) {}
}
