import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user)
      throw new UnauthorizedException({
        title: 'Please try again...',
        message:
          'The email or password you entered did not match our records, please double-check and try again.',
      });

    // if (user.isDeactivated)
    //   throw new ForbiddenException('This account is deactivated');

    return user;
  }
}
