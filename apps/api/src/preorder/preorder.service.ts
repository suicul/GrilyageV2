import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreorderDto } from './preorder.dto';

@Injectable()
export class PreorderService {
  private readonly logger = new Logger(PreorderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePreorderDto, userId?: string) {
    const preorder = await this.prisma.preorder.create({
      data: {
        userId: userId ?? null,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail ?? null,
        desiredDate: new Date(dto.desiredDate),
        guestCount: dto.guestCount ?? 1,
        comment: dto.comment ?? null,
      },
    });

    this.logger.log(`New preorder #${preorder.id} from ${dto.customerName}`);

    // TODO (infra): send notification to operator (email / push / WS)
    return preorder;
  }

  async list(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.preorder.findMany({
      where,
      orderBy: { desiredDate: 'asc' },
    });
  }

  async confirm(id: string) {
    const preorder = await this.prisma.preorder.findUnique({ where: { id } });
    if (!preorder) throw new Error('Предзаказ не найден');
    return this.prisma.preorder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  async cancel(id: string) {
    const preorder = await this.prisma.preorder.findUnique({ where: { id } });
    if (!preorder) throw new Error('Предзаказ не найден');
    return this.prisma.preorder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
