import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { User } from 'src/users/user.entity';
import { RegisterForPushDto } from '../dto/register-for-push.dto';
import { FcmTokenService } from '../fcm-token.service';

@Controller({
  path: 'fcm-token',
  version: '1',
})
@ApiTags('FCM Notification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class FcmTokenControllerV1 {
  /**
   * Register device for push notification
   */
  @Post()
  @ApiOperation({ summary: 'Register device for push notification' })
  async registerForPush(
    @AuthUser() authUser: User,
    @Body() registerForPushDto: RegisterForPushDto,
  ) {
    await this.fcmTokenService.registerForPush(authUser, registerForPushDto);
    return { message: 'Success' };
  }

  constructor(private readonly fcmTokenService: FcmTokenService) {}
}
