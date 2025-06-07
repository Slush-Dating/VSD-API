import { PickType } from '@nestjs/swagger';
import { User } from 'src/users/user.entity';

export class ForgotPasswordDto extends PickType(User, ['email']) {}
