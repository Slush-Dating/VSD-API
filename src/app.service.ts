import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnprocessableEntityException,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateRtcTokenDto } from './dto/generate-rtc-token.dto';
import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-access-token';
import { GenerateRtmTokenDto } from './dto/generate-rtm-token.dto';
import { Rekognition, S3 } from 'aws-sdk';
import { InjectAwsService } from 'nest-aws-sdk';
import * as moment from 'moment';
import * as uuid from 'uuid';
import { guessFileContentType, guessFileExtension } from './common/helper';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

type StoreToS3Type = {
  file: Express.Multer.File;
  options?: Partial<{
    checkForNudity: boolean;
    directory: string;
  }>;
};

@Injectable()
export class AppService {
  /**
   * Create RTC Token for Agoro Video Call
   */
  generateRtmToken(data: GenerateRtmTokenDto) {
    const appId = this.configService.get<string>('AGORA_APP_ID');
    const appCertificate = this.configService.get<string>(
      'AGORA_APP_CERTIFICATE',
    );

    return RtmTokenBuilder.buildToken(
      appId,
      appCertificate,
      data.account,
      RtcRole.PUBLISHER,
      moment().add(24, 'hours').unix(),
    );
  }

  /**
   * Create RTC Token for Agoro Video Call
   */
  public generateRtcToken(data: GenerateRtcTokenDto): string {
    const appId = this.configService.get<string>('AGORA_APP_ID');
    const appCertificate = this.configService.get<string>(
      'AGORA_APP_CERTIFICATE',
    );

    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      data.channelName,
      data.uid,
      RtcRole.PUBLISHER,
      moment().add(24, 'hours').unix(),
    );
  }

  public async detectInAppropriateImage(
    file: Express.Multer.File,
  ): Promise<void> {
    this.logger.log({
      level: 'info',
      message: 'Detecting In Appropriate Image!',
    });
    try {
      const response = await this.amazonRekognition
        .detectModerationLabels({
          Image: {
            Bytes: file.buffer,
          },
          MinConfidence: 70,
        })
        .promise();

        this.logger.log({
          level: 'info',
          message: response,
        });

      if (response.$response.httpResponse.statusCode !== HttpStatus.OK) {
        throw new BadRequestException('Failed to upload file.');
      }

      if (response.ModerationLabels?.[0]?.Name === 'Explicit Nudity' || response.ModerationLabels?.[0]?.Name === 'Nudity') {
        throw new BadRequestException(
          'File contains explicit content. Please provide a different one',
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Oops! Something went wrong');
    }
  }

  public async storeToS3(payload: StoreToS3Type): Promise<string> {
    const { options, file } = payload;
    let filename = [options.directory, uuid.v4()].join('/');
    const fileExtension = guessFileExtension(file.mimetype);
    filename = [filename, fileExtension].join('.');

    const contentType = guessFileContentType(fileExtension);
    const isVideo = contentType.includes('video');

    if (!isVideo && options.checkForNudity) {
      await this.detectInAppropriateImage(file);
    }

    try {
      const result = await this.amazonS3
        .putObject({
          Key: filename,
          Body: file.buffer,
          ContentType: contentType,
          Bucket: this.configService.get<string>('AWS_BUCKET'),
        })
        .promise();

      if (result.$response.error) {
        this.logger.log(
          this.logger.error,
          JSON.stringify(result.$response.error),
        );
        throw new UnprocessableEntityException('Oops! something went wrong.');
      }

      /**
       * TODO:
       * Detect In-appropriate video
       */

      return filename;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete from S3
   */
  public async deleteFromS3(key: string) {
    try {
      return await this.amazonS3
        .deleteObject({
          Key: key,
          Bucket: this.configService.get<string>('AWS_BUCKET'),
        })
        .promise();
    } catch (error) {
      this.logger.log(this.logger.error, JSON.stringify(error));
      throw error;
    }
  }

  constructor(
    @InjectAwsService(Rekognition)
    private readonly amazonRekognition: Rekognition,
    @InjectAwsService(S3)
    private readonly amazonS3: S3,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private configService: ConfigService,
  ) {}
}
