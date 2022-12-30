import { PickType } from '@nestjs/swagger';
import { User } from 'src/users/user.entity';

export class CheckPhoneExistDto extends PickType(User, ['phoneNumber']) {}
