import { PartialType, PickType } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsDateString,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { User } from '../user.entity';

export class UpdateUserDto extends PartialType(
  PickType(User, [
    'jobTitle',
    'firstName',
    'lastName',
    'country',
    'address',
    'height',
    'latitude',
    'longitude',
    'sexuality',
    'bio',
    'gender',
    'lookingFor',
    'ideal_vacation',
    'cooking_skill',
    'smoking_opinion',
    'avatar',
    'video',
  ] as const),
) {
  /**
   * @example 2021-12-16
   */
  @IsDateString()
  @IsOptional()
  readonly dateOfBirth?: Date;

  /**
   * @example true
   */
  @IsBooleanString()
  @IsOptional()
  readonly notifications?: string;

  /**
   * @example true
   */
  @IsBooleanString()
  @IsOptional()
  displayOnProfile?: string;

  /**
   * @example "cm"
   */
  @ValidateIf((o: UpdateUserDto) => o.height !== undefined)
  height_unit?: string;
}
