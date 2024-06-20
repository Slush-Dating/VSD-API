import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserProfilePicture } from 'src/chats/dto/chat.dto';
import { CastToBucket } from 'src/common/decorators/cast-to-bucket.decorator';
import { CastToUnixTimestamp } from 'src/common/decorators/cast-to-unix-timestamp.decorator';
import { Event } from '../event.entity';
import { Categories } from 'src/event-category/categories.entity';

export class EventList extends PickType(Event, [
  'title',
  'description',
  'minAge',
  'maxAge',
  'eventFee',
  'isFree',
  'isPopular',
  'gender',
  'address',
  'country',
  'latitude',
  'longitude',
  'type',
  'hasPassword',
  'password',
  'category',
]) {
  @Expose({ name: 'id' })
  eventId: number;

  @CastToBucket()
  @Expose()
  coverImage: string;

  @Expose()
  distance: number;

  @Expose()
  maleParticipants: number;

  @Expose()
  femaleParticipants: number;

  @Expose()
  totalParticipants: number;

  @CastToUnixTimestamp()
  @Expose()
  startsAt: number;

  @CastToUnixTimestamp()
  @Expose()
  endsAt: number;

  @Type(() => Categories)
  @Expose()
  categoryId: Categories;

  @Type(() => Participant)
  @Expose()
  participants: Participant[];

  @Type(() => WaitList)
  @Expose()
  waitlist: WaitList[];

  @CastToUnixTimestamp()
  @Expose()
  createdAt: number;
}

class User {
  @Expose({ name: 'id' })
  userId: number;

  @Expose({ name: 'gender' })
  gender: string;

  @Type(() => UserProfilePicture)
  @Expose()
  profilePictures: UserProfilePicture[];
}

export class Participant {
  @Expose({ name: 'id' })
  participantId: number;

  @Type(() => User)
  @Expose()
  user: User;
}
export class WaitList {
  @Expose({ name: 'id' })
  waitlistId: number;

  @Type(() => User)
  @Expose()
  user: User;
}
