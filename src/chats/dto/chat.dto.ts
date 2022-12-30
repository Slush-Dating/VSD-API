import { PickType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { CastToUnixTimestamp } from 'src/common/decorators/cast-to-unix-timestamp.decorator';
import { ProfilePicture } from 'src/profile-pictures/profile-picture.entity';
import { User } from 'src/users/user.entity';

class ChatUser extends PickType(User, [
  'firstName',
  'lastName',
  'email',
  'onlineStatus',
  'deactivatedAt',
]) {
  @Transform(({ obj }) => obj.id ?? obj.userId)
  @Expose()
  readonly userId: string;

  @Expose()
  @Type(() => UserProfilePicture)
  readonly profilePictures: UserProfilePicture[];
}

export class UserProfilePicture extends PickType(ProfilePicture, [
  'key',
  'userId',
]) {
  @Expose({ name: 'id' })
  profilePictureId: number;
}

export class ChatConversationListDto {
  @Expose({ name: 'id' })
  @Type(() => Number)
  readonly chatId: number;

  @Expose()
  @Type(() => ChatUser)
  readonly sender: ChatUser;

  @Expose()
  @Type(() => ChatUser)
  readonly receiver: ChatUser;

  @Expose()
  readonly content: string;

  @Expose()
  @Type(() => Number)
  readonly unreadCount: number;

  @Expose()
  @CastToUnixTimestamp()
  readonly createdAt: number;
}
