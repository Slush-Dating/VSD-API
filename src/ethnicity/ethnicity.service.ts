import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { Ethnicity } from './ethnicity.entity';

@Injectable()
export class EthnicityService {
  constructor(
    @InjectRepository(Ethnicity) private ethnicityRepo: Repository<Ethnicity>,
  ) {}

  public async findMany(
    options?: FindManyOptions<Ethnicity>,
  ): Promise<Ethnicity[]> {
    try {
      return await this.ethnicityRepo.find(options);
    } catch (error) {
      throw error;
    }
  }

  public async findByIds(ids?: number[]): Promise<Ethnicity[]> {
    try {
      return await this.ethnicityRepo.find({
        where: {
          id: In(ids),
        },
      });
    } catch (error) {
      throw error;
    }
  }
}
