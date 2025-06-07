import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsString,
  MinLength,
} from 'class-validator';

export class DeleteProfileDto {
  @ApiProperty({
    description: 'reason for delete profile',
    example: 'I have a privacy concern',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'password',
    example: 'password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
