import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeleteProfile } from './delete-profile.entity';
import { DeleteProfileService } from './delete-profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeleteProfile])],
  providers: [DeleteProfileService],
  exports: [DeleteProfileService],
})
export class DeleteProfileModule {}
