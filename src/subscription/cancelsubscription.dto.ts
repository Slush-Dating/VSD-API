import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiProperty({
    example: 'Remarks',
  })
  @IsNotEmpty()
  @IsString()
  remark: string;
}
