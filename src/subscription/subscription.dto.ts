import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SubscriptionDto {
  @ApiProperty({
    example: 1,
  })
  @IsNotEmpty()
  packageId: number;
}
