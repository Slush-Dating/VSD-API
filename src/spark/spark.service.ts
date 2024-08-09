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

  updateSparkEveryDay(userId: any[], spark_value: number) {
    userId.forEach(async (id) => {
      const findUser = await this.sparkLikeRepo.findOne({
        where: { user: id },
      });
      if (findUser) {
        findUser.total_sparks += spark_value;
        await this.sparkLikeRepo.save(findUser);
      } else {
        const newSparkLike = this.sparkLikeRepo.create({
          user: id,
          total_sparks: spark_value,
        });
        await this.sparkLikeRepo.save(newSparkLike);
      }
    });
  }

  async removeSparkLike(userId: number) {
    const findSpark = await this.sparkLikeRepo.findOne({
      where: {
        user: { id: userId },
      },
    });

    if (!findSpark) {
      throw new BadRequestException('Please purchase spark like');
    }

    await this.sparkLikeRepo.update(findSpark.id, {
      total_sparks: findSpark.total_sparks - 1,
    });
  }

  async remainSparks(user: User) {
    console.log(user);
    const findUser = await this.sparkLikeRepo.find({
      where: { user: { id: user.id } },
    });
    if (findUser[0]) {
      return { remain_sparks: findUser[0].total_sparks };
    } else {
      return { message: 'No spark purchased' };
    }
  }

  constructor(
    @InjectRepository(SparkLike)
    private sparkLikeRepo: Repository<SparkLike>,
  ) {}
}
