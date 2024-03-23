import { Module } from '@nestjs/common';
import { VideoVerseController } from './video-verse.controller';
import { ListVideoVerseService } from './list-video-verse.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileVideo } from 'src/profile-videos/profile-video.entity';
import { VideoVerseService } from './video-verse.service';
import { ProfileVideoLikesModule } from 'src/profile-video-likes/profile-video-likes.module';
import { ViewedVideosModule } from 'src/viewed_videos/viewed-videos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileVideo]),
    ProfileVideoLikesModule,
    ViewedVideosModule,
  ],
  providers: [ListVideoVerseService, VideoVerseService],
  controllers: [VideoVerseController],
  exports: [],
})
export class VideoVerseModule {}
