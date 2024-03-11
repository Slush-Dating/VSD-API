import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsString,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Old password',
    example: 'password',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    description: 'password',
    example: 'password',
  })
  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  newpassword: string;

  @ApiProperty({
    description: 'confirm password',
    example: 'password',
  })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;
}
