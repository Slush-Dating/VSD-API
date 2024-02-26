import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { Vacation } from './vacation.entity';

@Injectable()
export class VacationService {
  constructor(
    @InjectRepository(Vacation) private vacationRepo: Repository<Vacation>,
  ) {}

  public async findMany(
    options?: FindManyOptions<Vacation>,
  ): Promise<Vacation[]> {
    try {
      return await this.vacationRepo.find(options);
    } catch (error) {
      throw error;
    }
  }

  public async findByIds(ids?: number[]): Promise<Vacation[]> {
    try {
      return await this.vacationRepo.find({
        where: {
          id: In(ids),
        },
      });
    } catch (error) {
      throw error;
    }
  }
}
