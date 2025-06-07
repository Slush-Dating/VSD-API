import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class ReportFixtureUserDto {
  @IsInt()
  @IsNotEmpty()
  readonly participantId: number;

  @IsString()
  @IsNotEmpty()
  readonly reason!: string;
}
