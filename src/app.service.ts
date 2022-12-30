import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateRtcTokenDto } from './dto/generate-rtc-token.dto';
import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-access-token';
import { GenerateRtmTokenDto } from './dto/generate-rtm-token.dto';
import * as moment from 'moment';

@Injectable()
export class AppService {
  /**
   * Create RTC Token for Agoro Video Call
   */
  generateRtmToken(data: GenerateRtmTokenDto) {
    const appId = this.configService.get<string>('AGORA_APP_ID');
    const appCertificate = this.configService.get<string>(
      'AGORA_APP_CERTIFICATE',
    );

    return RtmTokenBuilder.buildToken(
      appId,
      appCertificate,
      data.account,
      RtcRole.PUBLISHER,
      moment().add(24, 'hours').unix(),
    );
  }

  /**
   * Create RTC Token for Agoro Video Call
   */
  generateRtcToken(data: GenerateRtcTokenDto): string {
    const appId = this.configService.get<string>('AGORA_APP_ID');
    const appCertificate = this.configService.get<string>(
      'AGORA_APP_CERTIFICATE',
    );

    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      data.channelName,
      data.uid,
      RtcRole.PUBLISHER,
      moment().add(24, 'hours').unix(),
    );
  }

  constructor(private configService: ConfigService) {}
}
