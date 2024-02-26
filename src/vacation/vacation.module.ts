import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VacationController } from './vacation.controller';
import { Vacation } from './vacation.entity';
import { VacationService } from './vacation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vacation])],
  controllers: [VacationController],
  providers: [VacationService],
  exports: [VacationService],
})
export class VacationModule {}
