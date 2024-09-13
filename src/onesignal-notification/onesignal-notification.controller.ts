import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { OnesignalNotificationService } from './onesignal-notification.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { User } from 'src/users/user.entity';
import { OnesignalNotificationDto } from './onesignal-notification.dto';

@Controller('onesignal-notification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Sent Notification')
export class OnesignalNotificationController {
  constructor(
    private readonly onesignalNotificationService: OnesignalNotificationService,
  ) {}

  @Post('send/android')
  async sendToAndroid(
    @AuthUser() authUser: User,
    @Body('message') message: string,
  ) {
    console.log('authUser====', authUser);
    // const result =
    //   await this.onesignalNotificationService.sendNotificationToAndroid(
    //     message,
    //   );
    // return result.data;

    return `success ${message}`;
  }

  @Post('send/profilepercentage')
  async sendProfileComplitionNotification(
    @AuthUser() authUser: User,
    @Body() oneSingalNotificationDto: OnesignalNotificationDto,
  ) {
    const { message } = oneSingalNotificationDto;
    const playerIds = ['43c43309-f47e-45fe-a83e-67aeb688bc85'];
    const result =
      await this.onesignalNotificationService.sendNotificationToAndroid(
        message,
        playerIds,
      );

    return result.data;
  }
}
