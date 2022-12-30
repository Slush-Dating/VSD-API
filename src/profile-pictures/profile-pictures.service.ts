import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfilePicture } from './profile-picture.entity';
import * as uuid from 'uuid';
import { bucketUrl, guessFileExtension } from 'src/common/helper';
import { Rekognition, S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { InjectAwsService } from 'nest-aws-sdk';

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

      const filename = await this.storeToS3(file);

      const { affected: affectedRows } = await this.profilePictureRepo.update(
        profilePictureId,
        {
          key: filename,
        },
      );

      if (affectedRows > 0) {
        await this.deleteFromS3(profilePicture.key);
      }

      return bucketUrl(filename);
    } catch (error) {
      throw error;
    }
  }

  private async checkForNudity(file: Express.Multer.File): Promise<void> {
    try {
      const response = await this.amazonRekognition
        .detectModerationLabels({
          Image: {
            Bytes: file.buffer,
          },
          MinConfidence: 70,
        })
        .promise();

      if (response.$response.httpResponse.statusCode !== HttpStatus.OK) {
        throw new BadRequestException('Oops! Something went wrong');
      }

      if (response.ModerationLabels?.[0]?.Name === 'Explicit Nudity') {
        throw new BadRequestException(
          'Image contains explicit content. Please provide a different one',
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Oops! Something went wrong');
    }
  }

  /**
   * Registration step
   */
  async uploadAvatar(authUser: User, file: Express.Multer.File): Promise<void> {
    try {
      const key = await this.storeToS3(file);
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
   * Store file to S3
   */
  private async storeToS3(
    file: Express.Multer.File,
    checkForNudity = true,
  ): Promise<string> {
    try {
      if (checkForNudity) await this.checkForNudity(file);

      const filename = `users/${uuid.v4()}.${guessFileExtension(file)}`;

      const result = await this.amazonS3
        .putObject({
          Body: file.buffer,
          ContentType: guessFileExtension(file),
          Key: filename,
          Bucket: this.configService.get<string>('AWS_BUCKET'),
        })
        .promise();

      if (result.$response.error) {
        this.logger.log(
          this.logger.ERROR,
          JSON.stringify(result.$response.error),
        );
        throw new UnprocessableEntityException('Oops! something went wrong.');
      }

      return filename;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete from S3
   */
  private deleteFromS3(key: string) {
    return this.amazonS3
      .deleteObject({
        Key: key,
        Bucket: this.configService.get<string>('AWS_BUCKET'),
      })
      .promise();
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
        ProfilePicture.MAX_PROFILE_PICTURES - authUser.profilePictures.length;

      const noOfPicturesCanUpload = ProfilePicture.MAX_PROFILE_PICTURES - 1;

      if (!files.length) {
        throw new BadRequestException('No photos are uploaded');
      }

      if (
        authUser.profilePictures.length >= ProfilePicture.MAX_PROFILE_PICTURES
      ) {
        throw new BadRequestException(
          `You've already added ${ProfilePicture.MAX_PROFILE_PICTURES} photos. You cannot add more unless you delete some photos`,
        );
      }

      if (files.length > noOfPicturesCanUpload) {
        throw new BadRequestException(
          `You cannot upload more than ${ProfilePicture.MAX_PROFILE_PICTURES} photos`,
        );
      }

      if (files.length > slotsRemaining) {
        throw new BadRequestException(
          `You can only add ${slotsRemaining} more photos. Whereas, your request contains ${files.length} photos`,
        );
      }

      await Promise.all(files.map((file) => this.checkForNudity(file)));

      const filenames = await Promise.all(
        files.map((file) => this.storeToS3(file, false)),
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

    // delete from db
    await this.profilePictureRepo
      .createQueryBuilder()
      .delete()
      .where('id IN (:ids)', { ids: picturesToDeleteFromDatabase })
      .execute();

    // delete from s3
    await Promise.all(
      picturesToDeleteFromS3.map((photo) => this.deleteFromS3(photo.key)),
    );

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
  ) {}
}
