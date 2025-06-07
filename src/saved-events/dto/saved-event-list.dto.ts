import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CastToBucket } from 'src/common/decorators/cast-to-bucket.decorator';
import { CastToUnixTimestamp } from 'src/common/decorators/cast-to-unix-timestamp.decorator';
import { SavedEvents } from '../saved-events.entity';
import { EventGenderEnum } from 'src/events/event.entity';
import { EventTypeDatesEnum } from 'src/events/events.service';

export class SavedEventList extends PickType(SavedEvents, [
  'id',
  'createdAt',
  'updatedAt',
]) {
  @CastToUnixTimestamp()
  @Expose()
  createdAt: number;

  @Type(() => Event)
  @Expose()
  event: Event[];
}

export class Event {
  @Expose({ name: 'id' })
  eventId: number;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  isFree: boolean;

  @Expose()
  eventFee: number;

  @Expose()
  isPopular: boolean;

  @Expose()
  gender: EventGenderEnum;

  @Expose()
  type: EventTypeDatesEnum;

  @CastToBucket()
  @Expose()
  coverImage: string;

  @CastToUnixTimestamp()
  @Expose()
  startsAt: number;

  @CastToUnixTimestamp()
  @Expose()
  endsAt: number;
}
