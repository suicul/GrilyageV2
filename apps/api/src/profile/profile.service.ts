import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { SaveConsentDto } from './dto/consent.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, string> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  }

  async findAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    return this.prisma.address.create({
      data: {
        userId,
        label: dto.label ?? null,
        street: dto.street,
        house: dto.house,
        apartment: dto.apartment ?? null,
        comment: dto.comment ?? null,
      },
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== userId) {
      throw new NotFoundException('Адрес не найден');
    }

    const data: Record<string, string> = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.street !== undefined) data.street = dto.street;
    if (dto.house !== undefined) data.house = dto.house;
    if (dto.apartment !== undefined) data.apartment = dto.apartment;
    if (dto.comment !== undefined) data.comment = dto.comment;

    return this.prisma.address.update({
      where: { id: addressId },
      data,
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== userId) {
      throw new NotFoundException('Адрес не найден');
    }

    await this.prisma.address.delete({
      where: { id: addressId },
    });
  }

  /* ─── Consent ─── */
  async getConsent(userId: string) {
    const consent = await this.prisma.userConsent.findUnique({
      where: { userId },
    });
    return consent ?? null;
  }

  async saveConsent(userId: string, dto: SaveConsentDto, ip?: string, userAgent?: string) {
    const data: any = {
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    };
    if (dto.marketing !== undefined) {
      data.marketingAcceptedAt = dto.marketing ? new Date() : null;
    }

    return this.prisma.userConsent.upsert({
      where: { userId },
      create: {
        userId,
        marketingAcceptedAt: dto.marketing ? new Date() : null,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
      update: data,
    });
  }
}
