import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SparkLikeDto {
  @ApiProperty({
    example: 1,
  })
  @IsNotEmpty()
  spark_value: number;
}
