import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserReport } from './user-report.entity';
import { UserReportService } from './user-report.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserReport])],
  providers: [UserReportService],
  exports: [UserReportService],
})
export class UserReportModule {}
