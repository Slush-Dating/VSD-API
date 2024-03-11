import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeactivateProfileDto {
  @ApiProperty({
    description: 'Reason for deactivating the account',
    example: 'Concerned about my data',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
