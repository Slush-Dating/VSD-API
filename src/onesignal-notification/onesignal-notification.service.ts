import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OnesignalNotificationService {
  private readonly oneSignalAndroidAppId: string;
  private readonly oneSignalIOSAppId: string;
  private readonly oneSignalRestApiKey: string;
  private readonly oneSignalIOSRestApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService, // Inject ConfigService
  ) {
    this.oneSignalAndroidAppId = this.configService.get<string>(
      'ONESIGNAL_ANDROID_APP_ID',
    );
    this.oneSignalIOSAppId = this.configService.get<string>(
      'ONESIGNAL_IOS_APP_ID',
    );
    this.oneSignalRestApiKey = this.configService.get<string>(
      'ONESIGNAL_ANDROID_REST_API_KEY',
    );
    this.oneSignalIOSRestApiKey = this.configService.get<string>(
      'ONESIGNAL_IOS_REST_API_KEY',
    );
  }

  async sendNotificationToAndroid(
    message: string,
    playerIds: string[],
  ): Promise<AxiosResponse<any>> {
    const url = 'https://onesignal.com/api/v1/notifications';
    const payload = {
      app_id: this.oneSignalAndroidAppId,
      contents: {
        en: message,
      },
      include_player_ids: playerIds,
    };

    const headers = {
      Authorization: `Basic ${this.oneSignalRestApiKey}`,
      'Content-Type': 'application/json',
    };

    return lastValueFrom(this.httpService.post(url, payload, { headers }));
  }

  async sendNotificationToIOS(
    message: string,
    playerIds: string[],
  ): Promise<AxiosResponse<any>> {
    const url = 'https://onesignal.com/api/v1/notifications';
    const payload = {
      app_id: this.oneSignalIOSAppId,
      contents: {
        en: message,
      },
      include_player_ids: playerIds,
    };

    const headers = {
      Authorization: `Basic ${this.oneSignalIOSRestApiKey}`,
      'Content-Type': 'application/json',
    };

    return lastValueFrom(this.httpService.post(url, payload, { headers }));
  }
}
