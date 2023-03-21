import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterestsController } from './interests.controller';
import { Interests } from './interests.entity';
import { InterestsService } from './interests.service';

@Module({
  imports: [TypeOrmModule.forFeature([Interests])],
  controllers: [InterestsController],
  providers: [InterestsService],
  exports: [InterestsService],
})
export class InterestsModule {}
