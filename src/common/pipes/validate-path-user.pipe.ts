import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ValidatePathUserPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    const user = await this.usersService.findOneOrFail({ id: value });
    return user;
  }

  constructor(private usersService: UsersService) {}
}
