import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Rekognition, S3 } from 'aws-sdk';
import { InjectAwsService } from 'nest-aws-sdk';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { ProfileVideo } from './profile-video.entity';
import { User } from 'src/users/user.entity';
import { AppService } from 'src/app.service';
import { UsersService } from 'src/users/users.service';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ProfileVideosService {
  /**
   * Remove profile videos
   */
  public async destroyMany(authUser: User, ids: number[]): Promise<User> {
    let { profileVideos } = authUser;
    profileVideos = profileVideos.filter((entity) => ids.includes(entity.id));

    const videosToDeleteFromS3 = profileVideos.flatMap((entity) => entity.key);

    const videosToDeleteFromDatabase = profileVideos.flatMap(
      (entity) => entity.id,
    );

    if (videosToDeleteFromDatabase.length) {
      // delete from db
      await this.profileVideoRepo
        .createQueryBuilder()
        .delete()
        .where('id IN (:ids)', { ids: videosToDeleteFromDatabase })
        .execute();
    }

    if (videosToDeleteFromS3.length) {
      // delete from s3
      await Promise.all(
        videosToDeleteFromS3.map((key) => {
          return this.appService.deleteFromS3(key);
        }),
      );
    }

    const userProfileVideos = await this.profileVideoRepo.find({
      user: { id: authUser.id },
    });

    if (
      userProfileVideos.length &&
      !userProfileVideos.some((entity) => entity.isPrimary)
    ) {
      await this.profileVideoRepo
        .createQueryBuilder()
        .update()
        .set({
          isPrimary: true,
        })
        .where('id = :id', { id: userProfileVideos?.[0].id })
        .execute();
    }

    return this.usersService.findOneByAttribute({
      where: { id: authUser.id },
      relations: ['profileVideos'],
    });
  }

  /**
   * Upload many profile videos
   */
  public async storeMany(
    authUser: User,
    files: Express.Multer.File[],
  ): Promise<User> {
    try {
      const slotsRemaining =
        ProfileVideo.MAX_VIDEOS - authUser.profileVideos.length;

      if (!files.length) {
        throw new BadRequestException('No video are uploaded');
      }

      if (authUser.profileVideos.length >= ProfileVideo.MAX_VIDEOS) {
        throw new BadRequestException(
          `You've already added ${ProfileVideo.MAX_VIDEOS} videos. You cannot add more unless you delete some videos`,
        );
      }

      if (files.length > slotsRemaining) {
        throw new BadRequestException(
          `You can only add ${slotsRemaining} more videos. Whereas, your request contains ${files.length} videos`,
        );
      }

      // TODO:
      //   await Promise.all(
      //     files.map((file) => this.appService.checkForNudity(file)),
      //   );

      const filenames = await Promise.all(
        files.map((file) => {
          return this.appService.storeToS3({
            file,
            options: { checkForNudity: false, directory: 'users' },
          });
        }),
      );

      const entities = filenames.map((filename) => {
        return this.profileVideoRepo.create({
          key: filename,
          user: authUser,
        });
      });

      if (
        slotsRemaining === ProfileVideo.MAX_VIDEOS &&
        !entities.some((entity) => entity.isPrimary)
      ) {
        entities[0].isPrimary = true;
      }

      await this.profileVideoRepo.save(entities);

      return await this.usersService.findById(authUser.id);
    } catch (error) {
      throw error;
    }
  }

  constructor(
    @InjectAwsService(Rekognition)
    private readonly amazonRekognition: Rekognition,
    @InjectAwsService(S3)
    private readonly amazonS3: S3,
    private configService: ConfigService,
    @InjectRepository(ProfileVideo)
    private profileVideoRepo: Repository<ProfileVideo>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private usersService: UsersService,
    private appService: AppService,
  ) {}
}
