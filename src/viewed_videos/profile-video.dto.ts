import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ProfileVideoDto {
  @ApiProperty({
    example: 1,
  })
  @IsNotEmpty()
  profile_video_id: number;
}
