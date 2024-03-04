import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventGenderEnum } from '../event.entity';

export enum EventTypeEnum {
  MY_EVENTS = 'me',
  UPCOMING_EVENTS = 'upcoming',
  POPULAR_EVENTS = 'popular',
}

export class GetEventDto {
  /**
   * @example 1631963105
   */
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Type(() => Number)
  readonly date?: number;

  /**
   * - Specify distance in miles
   * - Default is 50
   * @example 50
   */
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Type(() => Number)
  readonly distance?: number;

  /**
   * The type of the event: ['me' = My Events, 'upcoming' = Upcoming events, 'popular' = Popular Events]
   */
  @IsEnum(EventTypeEnum)
  @IsNotEmpty()
  @IsOptional()
  readonly events?: EventTypeEnum;

  @IsOptional()
  @IsString()
  latitude?: string;

  @IsOptional()
  @IsString()
  longitude?: string;
}
