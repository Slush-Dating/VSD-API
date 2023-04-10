import { PartialType, PickType } from '@nestjs/swagger';
import { IsBooleanString, IsDateString, IsOptional } from 'class-validator';
import { User } from '../user.entity';

export class UpdateUserDto extends PartialType(
  PickType(User, [
    'jobTitle',
    'firstName',
    'lastName',
    'ethnicity',
    'country',
    'address',
    'latitude',
    'longitude',
    'sexuality',
    'bio',
  ] as const),
) {
  /**
   * @example 2021-12-16
   */
  @IsDateString()
  @IsOptional()
  readonly dateOfBirth?: Date;

  /**
   * @example 2021-12-16
   */
  @IsBooleanString()
  @IsOptional()
  readonly notifications?: string;
}
