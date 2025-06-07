import { PickType } from '@nestjs/swagger';
import { User } from '../user.entity';

export class ChangeEmailDto extends PickType(User, ['email']) {}
