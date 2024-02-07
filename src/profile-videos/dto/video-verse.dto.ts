import { Expose, Transform, Type } from 'class-transformer';
import {
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { GenderEnum } from 'src/users/user.entity';

export class VideoVerseDto {
  /**
   * Min Age
   * @example 50
   */
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Type(() => Number)
  readonly minAge?: number;

  /**
   * Max Age
   * @example 50
   */
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Type(() => Number)
  readonly maxAge?: number;

  /**
   * - Specify distance in miles
   * - Default is 50
   * @example 50
   */
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Type(() => Number)
  readonly distance?: number;

  /**
   * @example -90.000000
   */
  @Transform(({ value }: { value: keyof VideoVerseDto }) => Number(value), {
    toPlainOnly: true,
  })
  @IsDecimal()
  @IsNotEmpty()
  @Expose()
  readonly latitude!: number;

  /**
   * @example 72.000000
   */
  @Transform(({ value }: { value: keyof VideoVerseDto }) => Number(value), {
    toPlainOnly: true,
  })
  @IsDecimal()
  @IsNotEmpty()
  @Expose()
  readonly longitude!: number;

  /**
   * @example male
   */
  @IsEnum(GenderEnum)
  @IsNotEmpty()
  @IsOptional()
  readonly gender?: GenderEnum;
}
