import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { User } from 'src/users/user.entity';
import { Pagination } from 'nestjs-typeorm-paginate';
import { NotificationType, Notifications } from './notifcations.entity';
import { NotificationList } from './notification-list.dto';
import { NotificationSettingsDto } from './notificationSettings.dto';
import { UsersService } from 'src/users/users.service';

@Controller('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Notifications')
export class NotificationsController {
  /**
   * Get notifcations
   */
  @ApiOperation({ summary: 'Get notifications' })
  @Get()
  public async geEvents(
    @AuthUser() authUser: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(15), ParseIntPipe) limit?: number,
    @Query('notification_type') notificationType?: NotificationType,
  ): Promise<any> {
    const { meta, items } = await this.notificationsService.getNotifications(
      authUser,
      {
        page,
        limit,
        notificationType,
      },
    );

    return { data: { items, meta } };
  }

  /**
   * Notifcation settings
   */
  @ApiOperation({ summary: 'Notification Settings' })
  @Post('settings')
  public async notificationSettings(
    @AuthUser() authUser: User,
    @Body() notificationSettingTypeDto?: NotificationSettingsDto,
  ): Promise<any> {
    const data = this.userService.updateUserNotificationType(
      authUser,
      notificationSettingTypeDto.notificationType,
      notificationSettingTypeDto.status,
    );
    return data;
  }
  constructor(
    private notificationsService: NotificationsService,
    private userService: UsersService,
  ) {}
}
