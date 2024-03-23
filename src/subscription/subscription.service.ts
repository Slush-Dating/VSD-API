import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
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

  constructor(
    @InjectRepository(SubScription)
    private subscriptionRepo: Repository<SubScription>,
  ) {}
}
