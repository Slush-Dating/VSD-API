import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppVersion } from './app-version.entity';
import { AppVersionService } from './app-version.service';
import { AppVersionControllerV1 } from './controllers/app-version-v1.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppVersion])],
  providers: [AppVersionService],
  controllers: [AppVersionControllerV1],
})
export class AppVersionModule {}
