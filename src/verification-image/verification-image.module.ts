import { Module, forwardRef } from '@nestjs/common';
import { VerificationImageService } from './verification-image.service';
import { VerificationImage } from './verification-image.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { AppModule } from 'src/app.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationImage]),
    forwardRef(() => UsersModule),
    forwardRef(() => AppModule),
  ],
  providers: [VerificationImageService],
  exports: [VerificationImageService],
})
export class VerificationImageModule {}
