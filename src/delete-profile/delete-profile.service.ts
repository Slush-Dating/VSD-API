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
import { User } from 'src/users/user.entity';

@Injectable()
export class DeleteProfileService {
  /**
   * Create entity
   */
  create(data: DeepPartial<DeleteProfile>) {
    return this.deleteProfileRepo.create(data);
  }

  async addDeleteProfile(reason: string, user: User) {
    const existingUser = await this.deleteProfileRepo.findOne({
      where: { user_id: user.id },
    });

    if (existingUser) {
      throw new BadRequestException('Already user deleted');
    }

    const deleteProfile = this.deleteProfileRepo.create({
      user_id: user.id,
      reason: reason,
    });

    await this.deleteProfileRepo.save(deleteProfile);
  }

  constructor(
    @InjectRepository(DeleteProfile)
    private deleteProfileRepo: Repository<DeleteProfile>,
  ) {}
}
