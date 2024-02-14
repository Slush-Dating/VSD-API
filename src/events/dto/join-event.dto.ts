import { IsInt, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class BookEventTicketDto {
  /**
   * The id of event
   * @example EVENT_ID
   */
  @IsInt()
  @IsNotEmpty()
  readonly eventId: number;

  @ValidateIf((object, value) => value != null)
  readonly password: string | null;
}
