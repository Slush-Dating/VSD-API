import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty } from 'class-validator';

export class BatchDeleteVideosDto {
  /**
   * Id's of profile video to delete
   * @example [1, 2]
   */
  @ApiProperty({ type: 'array', format: 'number' })
  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty({ each: true })
  readonly ids: number[];
}
