import { PickType } from '@nestjs/swagger';
import { User } from 'src/users/user.entity';

export class VerifyForgotPasswordDto extends PickType(User, [
  'email',
  'passwordResetCode',
]) {}
