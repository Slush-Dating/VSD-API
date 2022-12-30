import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAuthTokens {
  /**
   * @example f29404a6e4c6e8da7ee794b5ea5b0976f3d8f0fdf2db3af610a4d0b4bdb1f95f8837e998f40632db3d1ea211d0d7f5995c89f92d7b374d4c86e61987280ed92d
   */
  @IsString()
  @IsNotEmpty()
  readonly refreshToken: string;
}
