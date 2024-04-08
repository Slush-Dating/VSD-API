import { PickType } from '@nestjs/swagger';
import { User } from 'src/users/user.entity';

export class RegisterDto extends PickType(User, ['email', 'password']) {
  /**
   * Receive offers on email
   * @example false
   */
  receiveOffers?: boolean;
}
