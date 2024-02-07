import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EthnicityController } from './ethnicity.controller';
import { Ethnicity } from './ethnicity.entity';
import { EthnicityService } from './ethnicity.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ethnicity])],
  controllers: [EthnicityController],
  providers: [EthnicityService],
  exports: [EthnicityService],
})
export class EthnicityModule {}
