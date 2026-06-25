import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @Inject('USER_JWT_SERVICE') private readonly userJwtService: JwtService,
    @Inject('STAFF_JWT_SERVICE') private readonly staffJwtService: JwtService,
  ) {}

  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);
      if (!token) {
        client.emit('error', { message: 'Требуется авторизация' });
        client.disconnect();
        return;
      }
      // Try user JWT first, then staff JWT
      try {
        const payload = await this.userJwtService.verifyAsync(token);
        (client as any).userId = payload.sub;
        (client as any).tokenType = 'user';
        this.logger.log(`Chat client connected: ${client.id} (user: ${payload.sub})`);
      } catch {
        const payload = await this.staffJwtService.verifyAsync(token);
        (client as any).userId = payload.sub;
        (client as any).role = payload.role;
        (client as any).tokenType = 'staff';
        this.logger.log(`Chat client connected: ${client.id} (staff: ${payload.sub})`);
      }
    } catch {
      client.emit('error', { message: 'Неверный токен' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat.join')
  handleJoin(client: Socket, roomId: string) {
    client.join(`room:${roomId}`);
    this.logger.log(`Client ${client.id} joined room ${roomId}`);
  }

  @SubscribeMessage('chat.leave')
  handleLeave(client: Socket, roomId: string) {
    client.leave(`room:${roomId}`);
  }

  sendMessage(roomId: string, message: any) {
    this.server?.to(`room:${roomId}`).emit('chat.message', message);
  }

  typing(roomId: string, userId: string) {
    this.server?.to(`room:${roomId}`).emit('chat.typing', { roomId, userId });
  }

  roomAssigned(roomId: string, staffId: string) {
    this.server?.to(`room:${roomId}`).emit('chat.room.assigned', { roomId, staffId });
  }

  roomClosed(roomId: string) {
    this.server?.to(`room:${roomId}`).emit('chat.room.closed', { roomId });
  }
}
