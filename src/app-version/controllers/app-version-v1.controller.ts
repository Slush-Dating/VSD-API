import { Body, Controller, Post } from '@nestjs/common';
import { AppVersionService } from '../app-version.service';
import { CheckAppVersionDto } from '../dto/check-app-version.dto';

@Controller('app-version')
export class AppVersionControllerV1 {
  @Post('/check')
  async check(@Body() checkAppVersion: CheckAppVersionDto) {
    const flag = await this.appVersionService.check(checkAppVersion);

    return {
      data: {
        flag,
      },
    };
  }

  constructor(private appVersionService: AppVersionService) {}
}
