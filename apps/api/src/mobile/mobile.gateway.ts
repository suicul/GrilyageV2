import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@Injectable()
@WSGateway({
  namespace: '/mobile',
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class MobileGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MobileGateway.name);

  constructor(private readonly jwtService: JwtService) {}

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
      const payload = await this.jwtService.verifyAsync(token);
      (client as any).userId = payload.sub;
      this.logger.log(`Mobile client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.emit('error', { message: 'Неверный токен' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Mobile client disconnected: ${client.id}`);
  }

  notifyOrderCreated(order: any): void {
    this.server?.emit('order.created', order);
  }

  notifyOrderUpdated(order: any): void {
    this.server?.emit('order.updated', order);
  }
}
