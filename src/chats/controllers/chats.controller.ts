import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { join } from 'path';

@Controller({
  path: 'chats',
})
@ApiExcludeController()
export class ChatsController {
  @Get()
  index(@Req() req: Request, @Res() res: Response) {
    return res.sendFile(
      join(__dirname, '..', '..', '..', 'views/chat-demo.html'),
    );
  }
}
