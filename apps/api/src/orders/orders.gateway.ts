import { Logger, Inject } from '@nestjs/common';
import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WSGateway({
  namespace: '/staff',
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OrdersGateway.name);

  constructor(
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
      const payload = await this.staffJwtService.verifyAsync(token);
      (client as any).userId = payload.sub;
      (client as any).role = payload.role;
      this.logger.log(`Staff client connected: ${client.id} (staff: ${payload.sub})`);
    } catch {
      client.emit('error', { message: 'Неверный токен' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Staff client disconnected: ${client.id}`);
  }

  notifyOrderCreated(order: any): void {
    this.server?.emit('order.created', order);
  }

  notifyOrderUpdated(order: any): void {
    this.server?.emit('order.updated', order);
  }

  notifyCourierLocation(orderId: string, location: { latitude: number; longitude: number }): void {
    this.server?.emit('courier.location', { orderId, ...location });
  }
}
