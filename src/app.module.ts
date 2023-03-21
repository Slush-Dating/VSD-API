import { Module, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { join } from 'path';
import { AccessTokensModule } from './access-tokens/access-tokens.module';
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ParticipantsModule } from './participants/participants.module';
import { ChatsModule } from './chats/chats.module';
import { ValidatePathUserPipe } from './common/pipes/validate-path-user.pipe';
import { FcmTokenModule } from './fcm-token/fcm-token.module';
import { AppController } from './app.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { FixtureModule } from './fixtures/fixture.module';
import { UserReportModule } from './user-report/user-report.module';
import { AppVersionModule } from './app-version/app-version.module';
import { ProfilePicturesModule } from './profile-pictures/profile-pictures.module';
import { WinstonModule } from 'nest-winston';
import { NotificationLogsModule } from './notification-logs/notification-logs.module';
import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import { AwsSdkModule } from 'nest-aws-sdk';
import { Rekognition, S3 } from 'aws-sdk';
import { EnvSchema } from './common/env.schema';
import { ProfileVideosModule } from './profile-videos/profile-videos.module';
import { InterestsModule } from './interests/interests.module';
import { ProfileVideoLikesModule } from './profile-video-likes/profile-video-likes.module';
import { VideoVerseModule } from './video-verse/video-verse.module';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mailchimp = require('@mailchimp/mailchimp_marketing');

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: EnvSchema,
      expandVariables: true,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        namingStrategy: new SnakeNamingStrategy(),
        charset: 'utf8mb4_unicode_ci',
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          port: +configService.get<number>('MAIL_PORT'),
          secure: configService.get<string>('MAIL_ENCRYPTION') !== 'tls',
          from: configService.get<string>('MAIL_FROM'),
          auth: {
            user: configService.get<string>('MAIL_USERNAME'),
            pass: configService.get<string>('MAIL_PASSWORD'),
          },
        },
        preview: configService.get('NODE_ENV') === 'development',
        template: {
          dir: join(process.cwd(), 'views', 'emails'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    AwsSdkModule.forRootAsync({
      defaultServiceOptions: {
        useFactory: (configService: ConfigService) => ({
          region: configService.get<string>('AWS_REGION'),
          credentials: {
            accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY'),
          },
        }),
        imports: [ConfigModule],
        inject: [ConfigService],
      },
      services: [Rekognition, S3],
    }),
    WinstonModule.forRoot({
      transports: [
        new DailyRotateFile({
          format: winston.format.combine(
            winston.format.json(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          ),
          filename: 'app',
          extension: '.log',
          dirname: join(__dirname, '..', 'logs'),
          maxFiles: 60,
          maxSize: '2m',
        }),
      ],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    AccessTokensModule,
    RefreshTokensModule,
    EventsModule,
    UsersModule,
    ParticipantsModule,
    ChatsModule,
    FcmTokenModule,
    FixtureModule,
    UserReportModule,
    AppVersionModule,
    ProfilePicturesModule,
    NotificationLogsModule,
    ProfileVideosModule,
    InterestsModule,
    ProfileVideoLikesModule,
    VideoVerseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'VALIDATE_PATH_USER_PIPE',
      useClass: ValidatePathUserPipe,
    },
  ],
  exports: [AppService],
})
export class AppModule {
  constructor(private configService: ConfigService) {
    mailchimp.setConfig({
      apiKey: this.configService.get<string>('MAILCHIMP_API_KEY'),
      server: this.configService.get<string>('MAILCHIMP_SERVER_PREFIX'),
    });

    mailchimp.ping
      .get()
      .then((resp: Record<string, any>) => Logger.log(resp))
      .catch((err: Record<string, any>) => Logger.error(err));
  }
}
