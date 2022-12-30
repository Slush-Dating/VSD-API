import { PickType } from '@nestjs/swagger';
import { User } from 'src/users/user.entity';

export class LoginDto extends PickType(User, ['email', 'password']) {}
