import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event, EventGenderEnum } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
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
   * Add to waitlist
   */

  async addToWaitlist(user: User, event: Event): Promise<WaitList> {
    // console.log('user waitlist', user);
    // console.log('event waitlist', event);
    const waitlistData = this.waitListRepo.save(
      this.waitListRepo.create({
        event,
        user,
      }),
    );

    return waitlistData;
  }

  constructor(
    @InjectRepository(WaitList)
    private waitListRepo: Repository<WaitList>,
  ) {}
}
