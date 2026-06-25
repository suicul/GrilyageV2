import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WSGateway({
  namespace: '/orders',
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class UserOrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(UserOrdersGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket): Promise<void> {
    try {
      // Authenticate via token in auth.token handshake or query param
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
      this.logger.log(`User client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.emit('error', { message: 'Неверный токен' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`User client disconnected: ${client.id}`);
  }

  /**
   * Subscribe client to a specific order's events.
   * Client should emit: `subscribe` with `{ orderId: string }`
   */
  handleSubscribe(client: Socket, payload: { orderId: string }): void {
    const room = `order:${payload.orderId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);
  }

  /**
   * Unsubscribe client from an order's events.
   */
  handleUnsubscribe(client: Socket, payload: { orderId: string }): void {
    const room = `order:${payload.orderId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
  }

  /**
   * Notify all clients tracking this order about courier location update.
   */
  notifyCourierLocation(orderId: string, location: { latitude: number; longitude: number }): void {
    this.server?.to(`order:${orderId}`).emit('courier.location', {
      orderId,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  /**
   * Notify all clients tracking this order about status change.
   */
  notifyOrderUpdated(orderId: string, order: any): void {
    this.server?.to(`order:${orderId}`).emit('order.updated', order);
  }
}
