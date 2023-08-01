import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class GenerateRtcTokenDto {
  @IsNumber()
  @IsNotEmpty()
  // public readonly uid: number;
  public readonly account: string;

  @IsString()
  @IsNotEmpty()
  public readonly channelName: string;
}
