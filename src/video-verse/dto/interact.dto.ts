import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { ProfileVideoLikeStatusEnum } from 'src/profile-video-likes/profile-video-like.entity';

export class InteractDto {
  @IsEnum(ProfileVideoLikeStatusEnum)
  readonly status: ProfileVideoLikeStatusEnum;

  @IsNumber({}, { message: 'The :field field must be of type :attributes' })
  @IsNotEmpty()
  readonly user: number;
}
