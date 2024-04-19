import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SparkLike } from './spark.entity';
import { User } from 'src/users/user.entity';

@Injectable()
export class SparkLikeService {
  async addSparkLike(user: User, spark_value: number) {
    const findUser = await this.sparkLikeRepo.findOne({
      where: { user: user },
    });

    let totalSparks = spark_value;

    if (findUser) {
      totalSparks += findUser.total_sparks;
      findUser.total_sparks = totalSparks;
      await this.sparkLikeRepo.save(findUser);
    } else {
      const newSparkLike = this.sparkLikeRepo.create({
        user: user,
        total_sparks: totalSparks,
      });
      await this.sparkLikeRepo.save(newSparkLike);
    }
  }

  async removeSparkLike(userId: number) {
    const findSpark = await this.sparkLikeRepo.findOne({
      where: {
        user: { id: userId },
      },
    });

    if (!findSpark) {
      throw new BadRequestException('User not found');
    }

    await this.sparkLikeRepo.update(findSpark.id, {
      total_sparks: findSpark.total_sparks - 1,
    });
  }

  constructor(
    @InjectRepository(SparkLike)
    private sparkLikeRepo: Repository<SparkLike>,
  ) {}
}
