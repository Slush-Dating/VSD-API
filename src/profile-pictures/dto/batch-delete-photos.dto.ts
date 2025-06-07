import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class BatchDeletePhotosDto {
  /**
   * Id's of profile picture to delete
   * @example [1, 2]
   */
  @ApiProperty({ type: 'array', format: 'number' })
  @IsArray()
  @IsNotEmpty()
  readonly ids: number[];
}
