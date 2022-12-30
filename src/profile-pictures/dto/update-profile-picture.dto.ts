import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfilePictureDto {
  /**
   * New Profile Picture
   */
  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  file: Express.Multer.File;
}
