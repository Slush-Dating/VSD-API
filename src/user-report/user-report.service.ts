import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportUserProfileDto } from './dto/report-user-profile.dto';
import { UserReport } from './user-report.entity';

@Injectable()
export class UserReportService {
  /**
   * Report User
   */
  async reportUserProfile(
    primaryUserId: number,
    secondaryUserId: number,
    reportUserProfileDto: ReportUserProfileDto,
  ): Promise<void> {
    const userReport = await this.userReportRepo.findOne({
      where: {
        primaryUser: {
          id: primaryUserId,
        },
        secondaryUser: {
          id: secondaryUserId,
        },
      },
    });

    // update
    if (userReport) {
      userReport.reason = reportUserProfileDto.reason;
      userReport.additionalNotes = reportUserProfileDto.additionalNotes;
      await this.userReportRepo.save(userReport);
      return;
    }

    // save
    await this.userReportRepo.save(
      this.userReportRepo.create({
        primaryUser: {
          id: primaryUserId,
        },
        secondaryUser: {
          id: secondaryUserId,
        },
        ...reportUserProfileDto,
      }),
    );
  }

  constructor(
    @InjectRepository(UserReport)
    private userReportRepo: Repository<UserReport>,
  ) {}
}
