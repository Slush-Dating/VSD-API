import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViewedVideos } from './viewed-videos.entity';
import { ViewedVideosListService } from './viewed-videos.service';
import { ProfileVideosModule } from 'src/profile-videos/profile-videos.module';

@Module({
  imports: [TypeOrmModule.forFeature([ViewedVideos]), ProfileVideosModule],
  providers: [ViewedVideosListService],
  exports: [ViewedVideosListService],
})
export class ViewedVideosModule {}
