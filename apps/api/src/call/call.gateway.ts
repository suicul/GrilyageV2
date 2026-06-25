import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  namespace: '/calls',
  cors: {
    origin: (_origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CallGateway.name);

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
      this.logger.log(`Call client connected: ${client.id} (staff: ${payload.sub})`);
    } catch {
      client.emit('error', { message: 'Неверный токен' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Call client disconnected: ${client.id}`);
  }

  notifyCallEnqueued(call: any): void {
    this.server?.emit('call.enqueued', call);
    this.logger.log(`WS: call.enqueued ${call.id}`);
  }

  notifyCallDequeued(callId: string): void {
    this.server?.emit('call.dequeued', { id: callId });
  }

  notifyCallAccepted(call: any): void {
    this.server?.emit('call.accepted', call);
  }

  notifyCallConnected(call: any): void {
    this.server?.emit('call.connected', call);
  }

  notifyCallEnded(call: any): void {
    this.server?.emit('call.ended', call);
  }
}
