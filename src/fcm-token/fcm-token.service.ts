import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { RegisterForPushDto } from './dto/register-for-push.dto';
import { FcmToken } from './fcm-token.entity';

@Injectable()
export class FcmTokenService {
  /**
   * Register device for push notification
   */
  async deregister(userId: number): Promise<void> {
    await this.fcmTokenRepo
      .createQueryBuilder()
      .where('user = :userId', { userId })
      .delete()
      .execute();
  }

  /**
   * Register device for push notification
   */
  async registerForPush(
    authUser: User,
    registerForPushDto: RegisterForPushDto,
  ): Promise<void> {
    await this.deregister(authUser.id);

    const fcmToken = await this.fcmTokenRepo.findOne({
      where: {
        user: {
          id: authUser.id,
        },
      },
    });

    // save
    if (!fcmToken) {
      await this.fcmTokenRepo.save(
        this.fcmTokenRepo.create({
          ...registerForPushDto,
          user: authUser,
        }),
      );

      return;
    }

    // update
    await this.fcmTokenRepo.update(fcmToken.id, registerForPushDto);
  }

  constructor(
    @InjectRepository(FcmToken)
    private fcmTokenRepo: Repository<FcmToken>,
  ) {}
}
