import { forwardRef, Module } from '@nestjs/common';
import { ProfileVideoLikesService } from './profile-video-likes.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileVideoLike } from './profile-video-like.entity';
import { UsersModule } from 'src/users/users.module';
import { SparkLikeModule } from 'src/spark/spark.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileVideoLike]),
    forwardRef(() => UsersModule),
    SparkLikeModule,
  ],
  providers: [ProfileVideoLikesService],
  controllers: [],
  exports: [ProfileVideoLikesService],
})
export class ProfileVideoLikesModule {}
