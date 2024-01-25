import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BookEventTicketDto {
  /**
   * The id of event
   * @example EVENT_ID
   */
  @IsInt()
  @IsNotEmpty()
  readonly eventId: number;

  @IsString()
  @IsNotEmpty()
  password: string;
}
