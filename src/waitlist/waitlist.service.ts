import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { WaitList } from './waitlist.entity';

@Injectable()
export class WaitListService {
  async getWaitListForEvent(eventIds: string | string[]): Promise<WaitList[]> {
    try {
      const ids = Array.isArray(eventIds) ? eventIds : [eventIds];

      return await this.waitListRepo
        .createQueryBuilder('w')
        .select('w.id')
        .addSelect([
          'u.id',
          'u.gender',
          'u.firstName',
          'u.lastName',
          'e.id',
          'e.gender',
          'e.type',
        ])
        .leftJoin('w.user', 'u')
        .leftJoinAndSelect('u.profilePictures', 'pp')
        .leftJoinAndSelect('u.fcmTokens', 'uft')
        .leftJoin('w.event', 'e')
        .where('w.event IN (:...ids)', { ids })
        .andWhere('u.deactivatedAt IS NULL')
        .orderBy('w.createdAt', 'ASC')
        .getMany();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  /**
   * get waitlist waitlist
   */

  async getWaitlistRecord(user: User, event: Event): Promise<WaitList | null> {
    return await this.waitListRepo.findOne({
      where: {
        user,
        event,
      },
    });
  }

  /**
   * Add to waitlist
   */

  async addToWaitlist(user: User, event: Event): Promise<WaitList> {
    return await this.waitListRepo.save(
      this.waitListRepo.create({
        event,
        user,
      }),
    );
  }

  async getWaitlistEntriesForEventAndGender(
    event: Event,
    user: User,
  ): Promise<WaitList | undefined> {
    let query = this.waitListRepo
      .createQueryBuilder('p')
      .where('p.event_id = :eventId', { eventId: event.id })
      .addSelect(['u'])
      .leftJoin('p.user', 'u')
      .orderBy('p.createdAt', 'ASC');

    if (event.gender === 'straight' || event.gender === 'questioning') {
      query = query.andWhere('u.gender = :userGender', {
        userGender: user.gender,
      });
    }
    return query.getOne();
  }

  async removeWaitlistEntry(userId: number): Promise<void> {
    console.log('waitlist user id', userId);
    const waitlistEntry = await this.waitListRepo.findOne({
      user: { id: userId },
    });
    if (waitlistEntry) {
      console.log('remove');
      await this.waitListRepo.remove(waitlistEntry);
    } else {
      throw new Error('Waitlist entry not found');
    }
  }

  constructor(
    @InjectRepository(WaitList)
    private waitListRepo: Repository<WaitList>,
  ) {}
}
