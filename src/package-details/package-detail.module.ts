import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pacakagedetail } from './package-detail.entity';
import { PackagedetailService } from './package-detail.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pacakagedetail])],
  providers: [PackagedetailService],
  exports: [PackagedetailService],
})
export class PackageDetailModule {}
