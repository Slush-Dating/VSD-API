import { IsArray, IsNumber } from 'class-validator';

export class UpdateEthnicityDto {
  @IsArray()
  @IsNumber({}, { each: true })
  readonly ethnicity: number[];
}
