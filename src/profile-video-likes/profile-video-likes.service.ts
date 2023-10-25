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
import { ProfileVideoLike } from './profile-video-like.entity';
import { getMessaging } from 'firebase-admin/messaging';
import { auth } from 'firebase-admin';
import { NOTIFICATION } from 'src/common/constants';
@Injectable()
export class ProfileVideoLikesService {
  public async interactWithUser(
    authUser: User,
    interactDto: InteractDto,
  ): Promise<Boolean> {
    if (authUser.id === interactDto.user) {
      throw new BadRequestException('You cannot like yourself!');
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
    })

    if (!entity) {
      const newEntity = await this.repository.save(
        this.repository.create({
          from: { id: authUser.id },
          to: { id: user.id },
          status: interactDto.status,
        }),
      );
      this.sendNotificaiton("like", newEntity.status, authUser, user.id)
      if(newEntity && oppositeEntity) {
        if(newEntity.status == "LIKED" && oppositeEntity.status =="LIKED") {
          this.sendNotificaiton("match", newEntity.status, authUser, user.id)
          return true;
        }
      }
      return false
    }else{
      entity.status = interactDto.status;
      await this.repository.save(entity);
      this.sendNotificaiton("like", entity.status, authUser, user.id)
      if(entity && oppositeEntity) {
        if(entity.status == "LIKED" && oppositeEntity.status == "LIKED") {
          this.sendNotificaiton("match", entity.status, authUser, user.id)
          return true;
        }
      }
      return false
    }
  }

  async sendNotificaiton(category: string, status: string, authUser: User, receiverId: number ){
    if(status == 'LIKED'){
      const receiver = await this.usersService.findOneByAttribute({
        select: ['id', 'fcmTokens', 'notifications'],
        where: { id: receiverId },
        relations: ['fcmTokens', 'profilePictures'],
      });
      if (receiver.isNotificationOn && receiver.rawFcmTokens.length) {
        await getMessaging().sendMulticast(
          {
            data: {
              senderId: authUser.id.toString(),
              type: NOTIFICATION.MATCH,
              category: NOTIFICATION.MATCH,
              message: category == 'match' ? "New Match" : "",
              notificationCount:"1",
            },
            apns: {
              payload: {
                aps: {
                  alert: {
                    body: category == 'match' ? "New Match" : "",
                  },
                  category: NOTIFICATION.MATCH,
                  badge:1,
                  sound:"default"
                 },
                  // contentAvailable: true,
                },
              },
              tokens:receiver.rawFcmTokens,
            }
        //   {
        //   notification: {
        //     title: category == 'match' ? "New Match" : "",
        //     body: category == 'match' ? "New Match" : "",
        //   },
        //   android: {
        //     // notification: {
        //     //   title: category == 'match' ? "New Match" : "",
        //     //   body: category == 'match' ? "New Match" : "",
        //     //   notificationCount: 1,
        //     // },
        //     data:{
        //       type: NOTIFICATION.MATCH,
        //       category: "match",
        //       title: category == 'match' ? "New Match" : "",
        //       message: category == 'match' ? "New Match" : "",
        //       notificationCount: "1",
        //     }
        //   },
        //   apns: {
        //     payload: {
        //       aps: {
        //         badge: 1,
        //       },
        //     },
        //   },
        //   tokens: receiver.rawFcmTokens,
        // });
        //  // Also Sending Silent Notification
        //  await getMessaging().sendMulticast({
        //   apns: {
        //     payload: {
        //       aps: {
        //         contentAvailable: true,
        //       },
        //       category: category,
        //     },
        //   },
          
        //   tokens: receiver.rawFcmTokens,
        // }
        );
      }
    }else{
      console.log(">>>>> " + "USER DISLIKED VIDEO " + status)
    }
  }

  constructor(
    @InjectRepository(ProfileVideoLike)
    private repository: Repository<ProfileVideoLike>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}
}
