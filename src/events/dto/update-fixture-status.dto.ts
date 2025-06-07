import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { FixtureStatus } from 'src/fixtures/fixture.entity';

export class UpdateFixtureStatusDto {
  @IsInt()
  @IsNotEmpty()
  readonly participantId: number;

  @IsEnum(FixtureStatus)
  @IsNotEmpty()
  readonly status: FixtureStatus;
}
