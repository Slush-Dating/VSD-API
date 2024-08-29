import { PickType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { CastToUnixTimestamp } from 'src/common/decorators/cast-to-unix-timestamp.decorator';
import { Notifications } from './notifcations.entity';
import { ProfilePicture } from 'src/profile-pictures/profile-picture.entity';
import { bucketUrl } from 'src/common/helper';

export class ToUser {
  @Expose({ name: 'userId' })
  userId: number;

  @Expose()
  firstName: string;

  @Expose()
  email: string;

  // @Expose()
  // @Transform(({ value }: { value: ProfilePicture[] }) => value?.[0] || null)
  // profilePictures: ProfilePicture | null;

  @Expose()
  @Transform(
    ({ value }: { value: ProfilePicture[] }) =>
      (value?.[0]?.key && bucketUrl(value[0].key)) ?? null,
  )
  profilePictures: ProfilePicture | null;
}

export class FromUser {
  @Expose({ name: 'userId' })
  userId: number;

  @Expose()
  firstName: string;

  @Expose()
  email: string;

  @Expose()
  @Transform(
    ({ value }: { value: ProfilePicture[] }) =>
      (value?.[0]?.key && bucketUrl(value[0].key)) ?? null,
  )
  profilePictures: ProfilePicture | null;
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
