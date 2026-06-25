import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
  ) {}

  async createRoom(userId: string) {
    const existing = await this.prisma.chatRoom.findFirst({
      where: { userId, status: { in: ['OPEN', 'ASSIGNED'] } },
    });
    if (existing) return existing;

    const room = await this.prisma.chatRoom.create({
      data: { userId },
    });
    return room;
  }

  async getMyRoom(userId: string) {
    return this.prisma.chatRoom.findFirst({
      where: { userId, status: { in: ['OPEN', 'ASSIGNED'] } },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 50 },
      },
    });
  }

  async getRoomMessages(roomId: string, userId?: string, staffId?: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Чат не найден');
    if (userId && room.userId !== userId) throw new ForbiddenException();
    if (staffId && room.staffId !== staffId) throw new ForbiddenException();

    return this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async sendUserMessage(roomId: string, userId: string, text: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room || room.userId !== userId) throw new ForbiddenException();
    if (room.status === 'CLOSED') throw new NotFoundException('Чат закрыт');

    const msg = await this.prisma.chatMessage.create({
      data: { roomId, senderType: 'USER', senderId: userId, text },
    });
    this.gateway.sendMessage(roomId, msg);
    return msg;
  }

  async sendOperatorMessage(roomId: string, staffId: string, text: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Чат не найден');
    if (room.status === 'CLOSED') throw new NotFoundException('Чат закрыт');

    const msg = await this.prisma.chatMessage.create({
      data: { roomId, senderType: 'OPERATOR', senderId: staffId, text },
    });
    this.gateway.sendMessage(roomId, msg);
    return msg;
  }

  async assignRoom(roomId: string, staffId: string) {
    const room = await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { staffId, status: 'ASSIGNED' },
    });
    this.gateway.roomAssigned(roomId, staffId);
    return room;
  }

  async closeRoom(roomId: string) {
    const room = await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { status: 'CLOSED' },
    });
    this.gateway.roomClosed(roomId);
    return room;
  }

  async listOpenRooms(staffId?: string) {
    const where: any = { status: { in: ['OPEN', 'ASSIGNED'] } };
    if (staffId) where.staffId = staffId;

    return this.prisma.chatRoom.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async typing(roomId: string, userId?: string, staffId?: string) {
    this.gateway.typing(roomId, userId ?? staffId ?? '');
  }
}
