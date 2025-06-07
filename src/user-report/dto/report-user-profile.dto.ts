import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReportUserProfileDto {
  /**
   * @example Nudity
   */
  @MaxLength(250)
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  readonly reason!: string;

  /**
   * @example He is rude
   */
  @MaxLength(250)
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  readonly additionalNotes?: string;
}
