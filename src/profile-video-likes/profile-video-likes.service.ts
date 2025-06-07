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
import { NotificationsService } from 'src/notifications/notifications.service';
import { FcmTokenService } from 'src/fcm-token/fcm-token.service';
import { OnesignalNotificationService } from 'src/onesignal-notification/onesignal-notification.service';
@Injectable()
export class ProfileVideoLikesService {
  public async interactWithUser(
    authUser: User,
    interactDto: InteractDto,
  ): Promise<any> {
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
      if (
        (newEntity &&
          oppositeEntity &&
          newEntity.status === 'LIKED' &&
          oppositeEntity.status === 'LIKED') ||
        (newEntity &&
          oppositeEntity &&
          newEntity.status === 'SPARK LIKE' &&
          oppositeEntity.status === 'SPARK LIKE')
      ) {
        await this.notificationService.createMatchNotification(
          authUser,
          user,
          interactDto.status,
        );
        this.sendNotification('match', newEntity.status, authUser, user.id);
        await this.usersService.addReminderForLikedtabForMatch(authUser, user);
        return true;
      } else {
        console.log('here');
        await this.notificationService.createLikesNotification(
          authUser,
          user,
          interactDto.status,
        );
        await this.usersService.addReminderForLikedtabForLike(user);

        this.sendNotification('liked', newEntity.status, authUser, user.id);
      }

      return false;
    } else {
      entity.status = interactDto.status;
      await this.repository.save(entity);
      if (
        (entity &&
          oppositeEntity &&
          entity.status === 'LIKED' &&
          oppositeEntity.status === 'LIKED') ||
        (entity &&
          oppositeEntity &&
          entity.status === 'SPARK LIKE' &&
          oppositeEntity.status === 'SPARK LIKE')
      ) {
        await this.notificationService.createMatchNotification(
          authUser,
          user,
          interactDto.status,
        );
        this.sendNotification('match', entity.status, authUser, user.id);
        await this.usersService.addReminderForLikedtabForMatch(authUser, user);
        return true;
      } else {
        this.sendNotification('liked', entity.status, authUser, user.id);
      }

      return false;
    }
  }

  // async sendNotification(
  //   category: string,
  //   status: string,
  //   authUser: User,
  //   receiverId: number,
  // ) {
  //   if (status == 'LIKED') {
  //     const receiver = await this.usersService.findOneByAttribute({
  //       select: ['id', 'fcmTokens', 'notifications'],
  //       where: { id: receiverId },
  //       relations: ['fcmTokens', 'profilePictures'],
  //     });
  //     if (receiver.isNotificationOn && receiver.rawFcmTokens.length) {
  //       // await getMessaging().sendMulticast({
  //       //   data: {
  //       //     senderId: authUser.id.toString(),
  //       //     type: category,
  //       //     category: category,
  //       //     message: category == 'match' ? 'New Match' : 'Someone liked you',
  //       //     notificationCount: '1',
  //       //   },
  //       //   apns: {
  //       //     payload: {
  //       //       aps: {
  //       //         alert: {
  //       //           body: category == 'match' ? 'New Match' : 'Someone liked you',
  //       //         },
  //       //         category: category,
  //       //         badge: 1,
  //       //         sound: 'default',
  //       //         contentAvailable: true,
  //       //       },
  //       //     },
  //       //   },
  //       //   tokens: receiver.rawFcmTokens,
  //       // });
  //     }
  //   } else {
  //     console.log('>>>>> ' + 'USER DISLIKED VIDEO ' + status);
  //   }
  // }

  async sendNotification(
    category: string,
    status: string,
    authUser: User,
    receiverId: number,
  ) {
    if (status === 'LIKED' || status === 'SPARK LIKE') {
      const receiverDetails = await this.usersService.findUserById(receiverId);
      if (receiverDetails.isNewMatchNotification) {
        const findFcmDetails = await this.fcmTokensService.findUserDetail([
          receiverId,
        ]);

        console.log('findfcmdetails', findFcmDetails);
        console.log('receiverId', receiverId);

        const androidPlayerIds: string[] = [];
        const iosPlayerIds: string[] = [];

        findFcmDetails.forEach((f) => {
          console.log(f.user_id);
          if (f.device_type.toLowerCase() === 'android') {
            androidPlayerIds.push(...f.player_ids.split(','));
          }
          if (f.device_type.toLowerCase() === 'ios') {
            iosPlayerIds.push(...f.player_ids.split(','));
          }
        });

        const message =
          category === 'match' ? 'New Match' : `Someone likes you!`;

        if (androidPlayerIds.length > 0) {
          await this.oneSignalNotificationService.sendNotificationToAndroid(
            message,
            androidPlayerIds,
          );
        }

        if (iosPlayerIds.length > 0) {
          await this.oneSignalNotificationService.sendNotificationToIOS(
            message,
            iosPlayerIds,
          );
        }
      } else {
        console.log('no notification');
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
    public notificationService: NotificationsService,
    private fcmTokensService: FcmTokenService,
    private oneSignalNotificationService: OnesignalNotificationService,
  ) {}
}
