import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from 'src/app.module';
import { UsersModule } from 'src/users/users.module';
import { ProfileVideosController } from './controllers/profile-video.controller';
import { ProfileVideo } from './profile-video.entity';
import { ProfileVideosService } from './profile-videos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileVideo]),
    forwardRef(() => UsersModule),
    forwardRef(() => AppModule),
  ],
  controllers: [ProfileVideosController],
  providers: [ProfileVideosService],
  exports: [ProfileVideosService],
})
export class ProfileVideosModule {}
