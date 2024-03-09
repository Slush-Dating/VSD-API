import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PaginationOptions } from 'src/common/pagination-options';
import { Pagination, createPaginationObject } from 'nestjs-typeorm-paginate';
import { DeleteProfile } from './delete-profile.entity';

@Injectable()
export class DeleteProfileService {
  /**
   * Create entity
   */
  create(data: DeepPartial<DeleteProfile>) {
    return this.deleteProfileRepo.create(data);
  }

  constructor(
    @InjectRepository(DeleteProfile)
    private deleteProfileRepo: Repository<DeleteProfile>,
  ) {}
}
