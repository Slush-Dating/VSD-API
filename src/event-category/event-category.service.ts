import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { Categories } from './categories.entity';

@Injectable()
export class EventCategoryService {
  constructor(
    @InjectRepository(Categories)
    private eventCategoryRepo: Repository<Categories>,
  ) {}

  public async findMany(): Promise<any> {
    try {
      const categories = await this.eventCategoryRepo.find();
      const transformedCategories = categories.map((category) => ({
        ...category,
        image: `https://virtual-speed-date.s3.eu-west-2.amazonaws.com/${category.image}`,
      }));

      return transformedCategories;
    } catch (error) {
      throw error;
    }
  }

  public async addCategory() {
    await this.eventCategoryRepo.save({
      name: 'New Category',
      image: 'categorys/xgPkwlDoqCw00rDKq1AXKSHVFnoQGLMNslUltxzZ.jpg',
    });
  }
}
