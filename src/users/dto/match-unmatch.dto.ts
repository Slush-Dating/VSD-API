import { IsEnum } from 'class-validator';
import { FixtureStatus } from 'src/fixtures/fixture.entity';

export enum ActionsEnum {
  LIKED = 'LIKED',
  DISLIKED = 'DISLIKED',
}

export class MatchUnmatchDto {
  @IsEnum(FixtureStatus)
  action: ActionsEnum;
}
