import { PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Match } from 'src/common/decorators/match.decorator';
import { User } from 'src/users/user.entity';

export class ResetPasswordDto extends PickType(User, [
  'passwordResetToken',
  'password',
]) {
  @Match('password', { message: 'Both passwords must match' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
