import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class BookEventTicketDto {
  /**
   * The id of event
   * @example EVENT_ID
   */
  @IsInt()
  @IsNotEmpty()
  readonly eventId: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  password?: string;
}
