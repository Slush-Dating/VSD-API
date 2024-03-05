import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event, EventGenderEnum } from 'src/events/event.entity';
import { GenderEnum, User } from 'src/users/user.entity';
import { DeepPartial, Repository } from 'typeorm';
import { PaginationOptions } from 'src/common/pagination-options';
import { Pagination, createPaginationObject } from 'nestjs-typeorm-paginate';
import { WaitList } from './waitlist.entity';

@Injectable()
export class WaitListService {
  /**
   * Create entity
   */
  create(data: DeepPartial<WaitList>) {
    return this.waitListRepo.create(data);
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
    console.log(query.getOne());
    return query.getOne();
  }

  constructor(
    @InjectRepository(WaitList)
    private waitListRepo: Repository<WaitList>,
  ) {}
}
