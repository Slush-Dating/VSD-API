import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CastToUnixTimestamp } from 'src/common/decorators/cast-to-unix-timestamp.decorator';
import { Notifications } from './notifcations.entity';

export class ToUser {
  @Expose({ name: 'userId' })
  userId: number;

  @Expose()
  firstName: string;

  @Expose()
  email: string;

  @Expose()
  avatar: string;
}

export class FromUser {
  @Expose({ name: 'userId' })
  userId: number;

  @Expose()
  firstName: string;

  @Expose()
  email: string;

  @Expose()
  avatar: string;
}

export class NotificationList extends PickType(Notifications, [
  'notification_type',
  'notification_title',
  'notification_description',
]) {
  @Expose({ name: 'id' })
  id: number;

  @CastToUnixTimestamp()
  @Expose()
  createdAt: number;

  @Expose()
  actions: string;

  @Type(() => ToUser)
  @Expose()
  toUser: ToUser;

  @Type(() => FromUser)
  @Expose()
  fromUser: FromUser;
}
