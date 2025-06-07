import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from 'src/app.module';
import { UsersModule } from 'src/users/users.module';
import { ProfilePicturesControllerV1 } from './controllers/profile-pictures-v1.controller';
import { ProfilePicture } from './profile-picture.entity';
import { ProfilePicturesService } from './profile-pictures.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfilePicture]),
    forwardRef(() => UsersModule),
    forwardRef(() => AppModule),
  ],
  controllers: [ProfilePicturesControllerV1],
  providers: [ProfilePicturesService],
  exports: [ProfilePicturesService],
})
export class ProfilePicturesModule {}
