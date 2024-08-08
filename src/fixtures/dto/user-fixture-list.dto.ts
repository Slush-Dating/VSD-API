import { PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CastToBucket } from 'src/common/decorators/cast-to-bucket.decorator';
import { User } from 'src/users/user.entity';
import { FixtureStatus } from '../fixture.entity';

export class UserFixtureListDto extends PickType(User, [
  'firstName',
  'lastName',
] as const) {
  @Expose()
  readonly fixtureId: number;

  @Expose()
  readonly channelName: string;

  @Expose()
  readonly participantId: number;

  @Expose()
  readonly status: FixtureStatus;

  @Expose()
  readonly isReported: boolean;

  @Expose()
  readonly reportReason: string;

  @Expose()
  readonly date_of_birth: string;

  @Expose()
  readonly bio: string;

  @CastToBucket()
  @Expose()
  readonly avatar: string;

  @Expose()
  readonly video: string;
}
