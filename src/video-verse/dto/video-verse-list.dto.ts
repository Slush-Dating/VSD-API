import {
  Expose,
  plainToClass,
  plainToInstance,
  Transform,
} from 'class-transformer';
import { CastToBucket } from 'src/common/decorators/cast-to-bucket.decorator';
import { calculateAge } from 'src/common/helper';

export class User {
  @Expose({ name: 'userId' })
  readonly id: number;

  @Expose()
  @CastToBucket()
  readonly avatar: string;

  @Expose()
  readonly fullName: string;

  @Expose()
  readonly nickName: string;

  @Expose()
  @Transform(({ value }) => Number(value.toFixed(2)))
  readonly distance: number;

  @Expose({ name: 'dateOfBirth' })
  @Transform(({ value }) => calculateAge(value))
  readonly age: number;

  @Expose()
  readonly jobTitle: string;

  @Expose()
  readonly height: string;

  @Expose()
  readonly bio: string;

  @Expose()
  readonly address: string;

  @Expose()
  readonly country: string;
}

export class VideoVerseListDto {
  @Expose()
  readonly id: number;

  @Expose()
  @CastToBucket()
  readonly video: string;

  @Expose()
  @Transform(
    ({ obj }) => plainToInstance(User, obj, { excludeExtraneousValues: true }),
    // plainToClass(User, obj, { excludeExtraneousValues: true }),
  )
  readonly user: User;

  @Expose()
  @Transform(({ value }) => !!Number(value))
  readonly hasLiked: boolean;
}
