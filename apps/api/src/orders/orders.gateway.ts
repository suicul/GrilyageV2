import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WSGateway({
  namespace: '/staff',
  cors: { origin: '*', credentials: true },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Staff client connected: ${client.id}`);
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
}
