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

      console.log("USER LIKED VIDEO" + interactDto.status)
    if(interactDto.status == 'LIKED'){
      const receiver = await this.usersService.findOneByAttribute({
        select: ['id', 'fcmTokens', 'notifications'],
        where: { id: user },
        relations: ['fcmTokens', 'profilePictures'],
      });
      console.log(authUser.firstName + " liked " + receiver.firstName)
      if (receiver.isNotificationOn && receiver.rawFcmTokens.length) {
        await getMessaging().sendMulticast({
          // data: {
          //   senderId: data.from.toString(),
          //   type: NOTIFICATION.PRIVATE_MESSAGE,
          // },
          notification: {
            body: authUser.firstName + " liked you.",
          },
          android: {
            notification: {
              notificationCount: 1,
            },
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
              },
            },
          },
          tokens: receiver.rawFcmTokens,
        });
      }
    }
      if(newEntity && oppositeEntity) {
        if(newEntity.status == "LIKED" && oppositeEntity.status =="LIKED") {
          return true;
        }
      }
      return false
    }else{
      entity.status = interactDto.status;
      await this.repository.save(entity);

      if(entity && oppositeEntity) {
        if(entity.status == "LIKED" && oppositeEntity.status == "LIKED") {
          return true;
        }
      }
      return false
    }
  
  }

  constructor(
    @InjectRepository(ProfileVideoLike)
    private repository: Repository<ProfileVideoLike>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}
}
