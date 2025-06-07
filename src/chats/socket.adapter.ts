import { IoAdapter } from '@nestjs/platform-socket.io';
import { WsException } from '@nestjs/websockets';
import { Server, ServerOptions } from 'socket.io';

export class SocketAdapter extends IoAdapter {
  createIOServer(port: number, options: ServerOptions) {
    const io: Server = super.createIOServer(port, options);

    io.use((socket, next) => {
      const { userId } = socket.handshake.auth;

      if (!userId) {
        return next(new WsException('UnauthorizedException'));
      }

      socket['userId'] = userId;
      next();
    });

    return io;
  }
}
