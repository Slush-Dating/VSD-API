import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionPurchased, User } from 'src/users/user.entity';
import { Between, Repository } from 'typeorm';
import { ViewedVideos } from './viewed-videos.entity';
import { ProfileVideosService } from 'src/profile-videos/profile-videos.service';
import * as moment from 'moment';

@Injectable()
export class ViewedVideosListService {
  /**
   * Add to viewed_videos
   */

  async addToViewedVideoList(user: User, profileVideoId: number): Promise<any> {
    const currentDate = moment().startOf('day');
    const nextDate = moment(currentDate).endOf('day');

    const count = await this.viewedVideoRepo.count({
      where: {
        user: user,
        createdAt: Between(currentDate.toDate(), nextDate.toDate()),
      },
    });

    if (
      user.isSubscriptionPurchased === SubscriptionPurchased.No ||
      user.isSubscriptionPurchased === null
    ) {
      if (count >= 50) {
        throw new BadRequestException(
          "You've swiped your way to the limit today. Want to keep the momentum going? Upgrade now for unlimited swipes.",
        );
      }
    }

    const existingVideo = await this.viewedVideoRepo.findOne({
      where: { user: { id: user.id }, profileVideo: { id: profileVideoId } },
    });

    if (existingVideo) {
      throw new BadRequestException('This video is already in your view list');
    }

    const findProfileVideo =
      await this.profileVideoService.findProfileVideoById(profileVideoId);

    await this.viewedVideoRepo.save(
      this.viewedVideoRepo.create({
        profileVideo: findProfileVideo,
        user,
      }),
    );

    return count + 1;
  }

  /**
   * viewed_videos count
   */

  async viewedVideosCount(authUser: User) {
    const currentDate = moment().startOf('day');
    const nextDate = moment(currentDate).endOf('day');
    const count = await this.viewedVideoRepo.count({
      where: {
        user: authUser,
        createdAt: Between(currentDate.toDate(), nextDate.toDate()),
      },
    });

    let leftCount: number;
    if (
      authUser.isSubscriptionPurchased === SubscriptionPurchased.No ||
      authUser.isSubscriptionPurchased === null
    ) {
      leftCount = Math.max(50 - count, 0);
    } else {
      leftCount = undefined;
    }

    return { count, left_Swipes: leftCount };
  }

  constructor(
    @InjectRepository(ViewedVideos)
    private viewedVideoRepo: Repository<ViewedVideos>,
    private profileVideoService: ProfileVideosService,
  ) {}
}
