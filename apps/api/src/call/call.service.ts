import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CallGateway } from './call.gateway';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);
  private readonly livekitHost: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CallGateway,
    private readonly config: ConfigService,
  ) {
    this.livekitHost = `http://${this.config.get('LIVEKIT_HOST', 'localhost')}:${this.config.get('LIVEKIT_PORT', '7880')}`;
    this.apiKey = this.config.get('LIVEKIT_API_KEY', '');
    this.apiSecret = this.config.get('LIVEKIT_API_SECRET', '');
  }

  async enqueue(userId: string) {
    const active = await this.prisma.callQueue.findFirst({
      where: { userId, status: { in: ['QUEUED', 'CONNECTING', 'ACTIVE'] } },
    });
    if (active) throw new BadRequestException('У вас уже есть активный звонок');

    const roomName = `call_${userId}_${Date.now()}`;
    const queueCount = await this.prisma.callQueue.count({
      where: { status: 'QUEUED' },
    });
    const position = queueCount + 1;

    const call = await this.prisma.callQueue.create({
      data: { userId, roomName, status: 'QUEUED', position },
    });

    const token = this.generateToken(roomName, userId);
    this.gateway.notifyCallEnqueued(call);

    this.logger.log(`User ${userId} enqueued. Room: ${roomName}, Position: ${position}`);
    return { call, roomName, token };
  }

  async dequeue(userId: string) {
    const call = await this.prisma.callQueue.findFirst({
      where: { userId, status: 'QUEUED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!call) throw new NotFoundException('Нет активного звонка в очереди');

    await this.prisma.callQueue.update({
      where: { id: call.id },
      data: { status: 'ENDED', endedAt: new Date() },
    });

    this.gateway.notifyCallDequeued(call.id);
    this.logger.log(`User ${userId} dequeued`);
    return { success: true };
  }

  async accept(callId: string, staffUserId: string) {
    const call = await this.prisma.callQueue.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('Звонок не найден');
    if (call.status !== 'QUEUED') throw new BadRequestException('Звонок уже обработан');

    const updated = await this.prisma.callQueue.update({
      where: { id: callId },
      data: { status: 'CONNECTING' },
    });

    const operatorToken = this.generateToken(call.roomName, `operator-${staffUserId}`);
    this.gateway.notifyCallAccepted(updated);

    this.logger.log(`Call ${callId} accepted by staff ${staffUserId}`);
    return { call: updated, roomName: call.roomName, token: operatorToken };
  }

  async connect(callId: string) {
    const call = await this.prisma.callQueue.update({
      where: { id: callId },
      data: { status: 'ACTIVE' },
    });
    this.gateway.notifyCallConnected(call);
    return call;
  }

  async end(callId: string) {
    const call = await this.prisma.callQueue.update({
      where: { id: callId },
      data: { status: 'ENDED', endedAt: new Date() },
    });
    this.gateway.notifyCallEnded(call);
    return call;
  }

  async getQueue() {
    return this.prisma.callQueue.findMany({
      where: { status: { in: ['QUEUED', 'CONNECTING', 'ACTIVE'] } },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
  }

  private async generateToken(roomName: string, identity: string): Promise<string> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      ttl: '1h',
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    return token.toJwt();
  }
}
