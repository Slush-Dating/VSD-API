import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { Interests } from './interests.entity';

@Injectable()
export class InterestsService {
  constructor(
    @InjectRepository(Interests) private interestRepo: Repository<Interests>,
  ) {}

  public async findMany(
    options?: FindManyOptions<Interests>,
  ): Promise<Interests[]> {
    try {
      return await this.interestRepo.find(options);
    } catch (error) {
      throw error;
    }
  }

  public async findByIds(ids?: number[]): Promise<Interests[]> {
    try {
      return await this.interestRepo.find({
        where: {
          id: In(ids),
        },
      });
    } catch (error) {
      throw error;
    }
  }
}
