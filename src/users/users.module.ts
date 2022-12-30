import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersControllerV1 } from './controllers/users-v1.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UserReportModule } from 'src/user-report/user-report.module';
import { ProfilePicturesModule } from 'src/profile-pictures/profile-pictures.module';
import { FcmTokenModule } from 'src/fcm-token/fcm-token.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => AuthModule),
    forwardRef(() => ProfilePicturesModule),
    UserReportModule,
    FcmTokenModule,
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersControllerV1],
})
export class UsersModule {}
