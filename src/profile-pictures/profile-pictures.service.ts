import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfilePicture } from './profile-picture.entity';
import { bucketUrl } from 'src/common/helper';
import { Rekognition, S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { InjectAwsService } from 'nest-aws-sdk';
import { AppService } from 'src/app.service';

@Injectable()
export class ProfilePicturesService {
  /**
   * Update / Swap profile picture
   */
  async update(
    authUser: User,
    profilePictureId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    try {
      const { profilePictures } = authUser;

      if (!file) {
        throw new BadRequestException('The file field is missing');
      }

      const profilePicture = profilePictures.find(
        (photo) => photo.id === profilePictureId,
      );

      if (!profilePicture) {
        throw new NotFoundException('The profile picture is not found');
      }

      const filename = await this.appService.storeToS3({
        file,
        options: { checkForNudity: true, directory: 'users' },
      });

      const { affected: affectedRows } = await this.profilePictureRepo.update(
        profilePictureId,
        {
          key: filename,
        },
      );

      if (affectedRows > 0) {
        await this.appService.deleteFromS3(profilePicture.key);
      }

      return bucketUrl(filename);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Registration step
   */
  async uploadAvatar(authUser: User, file: Express.Multer.File): Promise<void> {
    try {
      const key = await this.appService.storeToS3({
        file,
        options: { checkForNudity: true, directory: 'users' },
      });
      await this.profilePictureRepo.save(
        this.profilePictureRepo.create({
          key,
          user: authUser,
        }),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload many profile pictures
   */
  public async storeMany(
    authUser: User,
    files: Express.Multer.File[],
  ): Promise<User> {
    try {
      const slotsRemaining =
        ProfilePicture.MAX_PICTURES - authUser.profilePictures.length;

      const noOfPicturesCanUpload = ProfilePicture.MAX_PICTURES - 1;

      if (!files.length) {
        throw new BadRequestException('No photos are uploaded');
      }

      if (authUser.profilePictures.length >= ProfilePicture.MAX_PICTURES) {
        throw new BadRequestException(
          `You've already added ${ProfilePicture.MAX_PICTURES} photos. You cannot add more unless you delete some photos`,
        );
      }

      if (files.length > noOfPicturesCanUpload) {
        throw new BadRequestException(
          `You cannot upload more than ${ProfilePicture.MAX_PICTURES} photos`,
        );
      }

      if (files.length > slotsRemaining) {
        throw new BadRequestException(
          `You can only add ${slotsRemaining} more photos. Whereas, your request contains ${files.length} photos`,
        );
      }

      await Promise.all(
        files.map((file) => this.appService.detectInAppropriateImage(file)),
      );

      const filenames = await Promise.all(
        files.map((file) => {
          return this.appService.storeToS3({
            file,
            options: { checkForNudity: false, directory: 'users' },
          });
        }),
      );

      const data = filenames.map((filename) => {
        return this.profilePictureRepo.create({
          key: filename,
          user: authUser,
        });
      });

      await this.profilePictureRepo.save(data);
      return await this.usersService.findById(authUser.id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload many profile pictures
   */
  public async storeManyLink(
    authUser: User,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    // Change return type to an array of strings
    try {
      // const slotsRemaining =
      //   ProfilePicture.MAX_PICTURES - authUser.profilePictures.length;

      // const noOfPicturesCanUpload = ProfilePicture.MAX_PICTURES - 1;

      if (!files.length) {
        throw new BadRequestException('No photos or videos are uploaded');
      }

      // if (authUser.profilePictures.length >= ProfilePicture.MAX_PICTURES) {
      //   throw new BadRequestException(
      //     `You've already added ${ProfilePicture.MAX_PICTURES} photos. You cannot add more unless you delete some photos`,
      //   );
      // }

      // if (files.length > noOfPicturesCanUpload) {
      //   throw new BadRequestException(
      //     `You cannot upload more than ${ProfilePicture.MAX_PICTURES} photos`,
      //   );
      // }

      // if (files.length > slotsRemaining) {
      //   throw new BadRequestException(
      //     `You can only add ${slotsRemaining} more photos. Whereas, your request contains ${files.length} photos`,
      //   );
      // }

      await Promise.all(
        files.map((file) => this.appService.detectInAppropriateFile(file)),
      );

      const filenames = await Promise.all(
        files.map((file) => {
          return this.appService.storeToS3({
            file,
            options: { checkForNudity: false, directory: 'users' },
          });
        }),
      );

      // Return the file links instead of creating records in profilePictureRepo
      return filenames.map(
        (filename) =>
          `https://virtual-speed-date.s3.eu-west-2.amazonaws.com/${filename}`,
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove profile pictures
   */
  public async destroyMany(authUser: User, ids: number[]): Promise<User> {
    const { profilePictures } = authUser;

    // remove avatar
    profilePictures.splice(0, 1);

    const picturesToDeleteFromS3 = profilePictures;

    const picturesToDeleteFromDatabase = profilePictures
      .flatMap((a) => a.id)
      .filter((a: number) => ids.find((b: number) => a === b));

    if (picturesToDeleteFromDatabase.length) {
      // delete from db
      await this.profilePictureRepo
        .createQueryBuilder()
        .delete()
        .where('id IN (:ids)', { ids: picturesToDeleteFromDatabase })
        .execute();
    }

    if (picturesToDeleteFromS3.length) {
      // delete from s3
      await Promise.all(
        picturesToDeleteFromS3.map((photo) => {
          return this.appService.deleteFromS3(photo.key);
        }),
      );
    }

    return this.usersService.findById(authUser.id);
  }

  constructor(
    @InjectRepository(ProfilePicture)
    private profilePictureRepo: Repository<ProfilePicture>,
    private configService: ConfigService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @InjectAwsService(Rekognition)
    private readonly amazonRekognition: Rekognition,
    @InjectAwsService(S3)
    private readonly amazonS3: S3,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private appService: AppService,
  ) {}
}
