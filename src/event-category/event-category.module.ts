import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categories } from './categories.entity';
import { EventCategoryService } from './event-category.service';
import { EventCategoryController } from './event-category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Categories])],
  controllers: [EventCategoryController],
  providers: [EventCategoryService],
  exports: [EventCategoryService],
})
export class EventCategoryModule {}
