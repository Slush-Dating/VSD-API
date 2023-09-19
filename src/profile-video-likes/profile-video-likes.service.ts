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

@Injectable()
export class ProfileVideoLikesService {
  public async interactWithUser(
    authUser: User,
    interactDto: InteractDto,
  ): Promise<Boolean> {
    if (authUser.id === interactDto.user) {
      throw new BadRequestException('You cannot like your ownself!');
    }

    const user = await this.usersService.findOneOrFail({
      id: interactDto.user,
    });

    const entity = await this.repository.findOne({
      from: { id: authUser.id },
      to: { id: user.id },
    });


    if (!entity) {
      await this.repository.save(
        this.repository.create({
          from: { id: authUser.id },
          to: { id: user.id },
          status: interactDto.status,
        }),
      );
    }else{
      entity.status = interactDto.status;
      await this.repository.save(entity);
    }

    const oppositeEntity = await this.repository.findOne({
      from: { id: user.id },
      to: { id: authUser.id },
    })

    if(entity && oppositeEntity) {
      if(entity.status == "LIKED" && oppositeEntity.status == "LIKED") {
        return true;
      }
    }
    return false
  }

  constructor(
    @InjectRepository(ProfileVideoLike)
    private repository: Repository<ProfileVideoLike>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}
}
