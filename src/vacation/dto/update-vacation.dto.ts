import { IsArray, IsNumber } from 'class-validator';

export class UpdateVacationDto {
  @IsArray()
  @IsNumber({}, { each: true })
  readonly vacation: number[];
}
