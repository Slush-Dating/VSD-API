import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({
    description: 'reason for delet profile',
    example: 'I have a privacy concern',
  })
  @IsNotEmpty()
  @IsNumberString()
  reason: string;

  @ApiProperty({
    description: 'password',
  })
  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  password: string;
}
