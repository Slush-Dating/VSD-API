import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SparkLike } from './spark.entity';
import { SparkLikeService } from './spark.service';

@Module({
  imports: [TypeOrmModule.forFeature([SparkLike])],
  providers: [SparkLikeService],
  exports: [SparkLikeService],
})
export class SparkLikeModule {}
