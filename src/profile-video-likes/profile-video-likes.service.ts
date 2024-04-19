import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { InteractDto } from 'src/video-verse/dto/interact.dto';
import { Repository } from 'typeorm';
import {
  ProfileVideoLike,
  ProfileVideoLikeStatusEnum,
} from './profile-video-like.entity';
import { getMessaging } from 'firebase-admin/messaging';
import { SparkLikeService } from 'src/spark/spark.service';
@Injectable()
export class ProfileVideoLikesService {
  public async interactWithUser(
    authUser: User,
    interactDto: InteractDto,
  ): Promise<Boolean> {
    if (authUser.id === interactDto.user) {
      throw new BadRequestException('You cannot like yourself!');
    }

    // spark count -1
    if (interactDto.status === ProfileVideoLikeStatusEnum.SPARKLIKE) {
      await this.sparkLikeService.removeSparkLike(authUser.id);
    }

    const user = await this.usersService.findOneOrFail({
      id: interactDto.user,
    });

    const entity = await this.repository.findOne({
      from: { id: authUser.id },
      to: { id: user.id },
    });

    const oppositeEntity = await this.repository.findOne({
      from: { id: user.id },
      to: { id: authUser.id },
    });

    if (!entity) {
      const newEntity = await this.repository.save(
        this.repository.create({
          from: { id: authUser.id },
          to: { id: user.id },
          status: interactDto.status,
        }),
      );

      // this.sendNotification("video-liked", newEntity.status, authUser, user.id)
      if (newEntity && oppositeEntity) {
        if (newEntity.status == 'LIKED' && oppositeEntity.status == 'LIKED') {
          this.sendNotification('match', newEntity.status, authUser, user.id);
          return true;
        }
      }
      return false;
    } else {
      entity.status = interactDto.status;
      await this.repository.save(entity);
      // this.sendNotification("video-liked", entity.status, authUser, user.id)
      if (entity && oppositeEntity) {
        if (entity.status == 'LIKED' && oppositeEntity.status == 'LIKED') {
          this.sendNotification('match', entity.status, authUser, user.id);
          return true;
        }
      }

      return false;
    }
  }

  async sendNotification(
    category: string,
    status: string,
    authUser: User,
    receiverId: number,
  ) {
    if (status == 'LIKED') {
      const receiver = await this.usersService.findOneByAttribute({
        select: ['id', 'fcmTokens', 'notifications'],
        where: { id: receiverId },
        relations: ['fcmTokens', 'profilePictures'],
      });
      if (receiver.isNotificationOn && receiver.rawFcmTokens.length) {
        await getMessaging().sendMulticast({
          data: {
            senderId: authUser.id.toString(),
            type: category,
            category: category,
            message: category == 'match' ? 'New Match' : 'Someone liked you',
            notificationCount: '1',
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  body: category == 'match' ? 'New Match' : 'Someone liked you',
                },
                category: category,
                badge: 1,
                sound: 'default',
                contentAvailable: true,
              },
            },
          },
          tokens: receiver.rawFcmTokens,
        });
      }
    } else {
      console.log('>>>>> ' + 'USER DISLIKED VIDEO ' + status);
    }
  }

  constructor(
    @InjectRepository(ProfileVideoLike)
    private repository: Repository<ProfileVideoLike>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private sparkLikeService: SparkLikeService,
  ) {}
}
