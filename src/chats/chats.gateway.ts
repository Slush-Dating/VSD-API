import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';
import { ChatsService } from './chats.service';

@WebSocketGateway({
  credentials: true,
})
export class ChatsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('connection')
  async handleConnection(@ConnectedSocket() socket: Socket) {
    console.log('connected');

    // join room
    socket.join(socket['userId']);
    console.log('socket joined room:', socket['userId']);

    // update online status
    await this.usersService.update(socket['userId'], { onlineStatus: true });

    socket.broadcast.emit('user connected', { userId: socket['userId'] });

    // disconnect
    socket.on('disconnect', async () => {
      console.log('disconnect');

      socket.broadcast.emit('user disconnected', {
        userId: socket['userId'],
      });

      await this.usersService.update(socket['userId'], {
        onlineStatus: false,
      });
    });
  }

  @SubscribeMessage('private message')
  async handlePrivateMessage(@MessageBody() data: any) {
    const chat = await this.chatsService.privateMessage({
      ...data,
      readBySender: new Date(),
    });
    console.log("$$$ SOCKET:")
    console.log(`User ${data.from} to User ${data.to} sending msg: ${data.content}`)
    console.log("$$$ PM:")
    console.log(`User ${chat.sender} to User ${chat.receiver} sending msg: ${chat.content}`)
    this.server.to(data.from).to(data.to).emit('private message', chat);
  }

  @SubscribeMessage('user is typing')
  handleStartTyping(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ): void {
    const payload = {
      from: data.from,
      to: data.to,
    };

    socket.to(payload.to).emit('user is typing', payload);
  }

  @SubscribeMessage('check opponent user online status')
  async handleCheckOpponentUserOnlineStatus(
    @MessageBody() data: any,
  ): Promise<any> {
    const user = await this.usersService.findOneByAttribute({
      where: { id: data.userId },
    });

    return { online: user?.isOnline || false };
  }

  constructor(
    private usersService: UsersService,
    private chatsService: ChatsService,
  ) {}
}
