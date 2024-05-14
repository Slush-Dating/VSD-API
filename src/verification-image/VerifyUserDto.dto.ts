import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class VerifyUserDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  verification_image: Express.Multer.File;
}
