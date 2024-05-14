import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VerificationImage } from './verification-image.entity';
import { ConfigService, Rekognition, S3 } from 'aws-sdk';
import { InjectAwsService } from 'nest-aws-sdk';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { AppService } from 'src/app.service';
import { User } from 'src/users/user.entity';

@Injectable()
export class VerificationImageService {
  /**
   * Registration step
   */
  async uploadVerificationImage(
    authUser: User,
    file: Express.Multer.File,
  ): Promise<any> {
    try {
      const findUser = await this.repository.findOne({
        where: { user: authUser },
      });

      if (findUser) {
        return {
          message:
            'We are currently reviewing your picture and will get back to you soon.',
        };
      } else {
        const key = await this.appService.storeToS3({
          file,
          options: { checkForNudity: true, directory: 'users' },
        });
        await this.repository.save(
          this.repository.create({
            key,
            user: authUser,
          }),
        );
        return {
          message:
            'We are currently reviewing your picture and will get back to you soon.',
        };
      }
    } catch (error) {
      throw error;
    }
  }

  constructor(
    @InjectRepository(VerificationImage)
    private repository: Repository<VerificationImage>,
    private appService: AppService,
  ) {}
}
