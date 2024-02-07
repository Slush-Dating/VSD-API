import { ApiProperty } from '@nestjs/swagger';

export class BatchUploadDto {
  /**
   * profile videos
   */
  @ApiProperty({
    isArray: true,
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  files?: Express.Multer.File[];
}
