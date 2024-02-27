import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({
    description: 'Latitude value',
    example: '40.7128',
  })
  @IsNotEmpty()
  @IsNumberString()
  latitude: string;

  @ApiProperty({
    description: 'Longitude value',
    example: '-74.0060',
  })
  @IsNotEmpty()
  @IsNumberString()
  longitude: string;
}
