import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
} from 'class-validator';

export enum EventResultTypeEnum {
  LIKED = 'liked',
  MATCHES = 'matches',
}

export class EventResultDto {
  /**
   * The id of the event
   * @example 101
   */
  @IsNumberString()
  @IsNotEmpty()
  @IsOptional()
  event?: string;

  /**
   * Default is "matches"
   */
  @IsEnum(EventResultTypeEnum)
  @IsNotEmpty()
  @IsOptional()
  type?: EventResultTypeEnum;
}
