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

  constructor(
    @InjectRepository(WaitList)
    private waitListRepo: Repository<WaitList>,
  ) {}
}
