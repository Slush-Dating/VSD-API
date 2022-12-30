import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateRtmTokenDto {
  /**
   * Account Number
   * @example "123456"
   */
  @IsString()
  @IsNotEmpty()
  public readonly account: string;
}
