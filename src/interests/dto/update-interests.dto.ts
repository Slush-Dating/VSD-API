import { IsArray, IsNumber } from 'class-validator';

export class UpdateInterestsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  readonly interests: number[];
}
