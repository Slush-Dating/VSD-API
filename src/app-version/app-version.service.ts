import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion, AppVersionStatusEnum } from './app-version.entity';
import { compare as compareVersions } from 'compare-versions';
import { CheckAppVersionDto } from './dto/check-app-version.dto';

@Injectable()
export class AppVersionService {
  /**
   * Check App Version
   */
  async check(
    checkAppVersion: CheckAppVersionDto,
  ): Promise<AppVersionStatusEnum> {
    const appVersion = await this.appVersionRepo.findOne({
      where: {
        type: checkAppVersion.type,
      },
    });

    if (!appVersion)
      throw new UnprocessableEntityException(
        'No version history found in the database',
      );

    const minVersionCompare = compareVersions(
      checkAppVersion.currentVersion,
      appVersion.minVersion,
      '<',
    );

    let flag: AppVersionStatusEnum;

    if (minVersionCompare) {
      flag = AppVersionStatusEnum.FORCE_UPDATE;
    } else if (
      compareVersions(
        appVersion.minVersion,
        checkAppVersion.currentVersion,
        '<=',
      ) &&
      compareVersions(
        checkAppVersion.currentVersion,
        appVersion.latestVersion,
        '<',
      )
    ) {
      flag = AppVersionStatusEnum.APP_UPDATE;
    } else {
      flag = AppVersionStatusEnum.NO_UPDATE;
    }

    return flag;
  }

  constructor(
    @InjectRepository(AppVersion)
    private readonly appVersionRepo: Repository<AppVersion>,
  ) {}
}
