import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsQueryDto } from './dto/products-query.dto';
import { normalizeSearchText, toKopecks } from '@grilyage/shared';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private addComputedPrice(product: any) {
    return { ...product, price: toKopecks(product.priceRubles, product.priceKopecks) };
  }

  async findAllSubcategories() {
    return this.prisma.subcategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findAllCategories(loadAll = false) {
    const cats = await this.prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        subcategories: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            products: {
              where: { active: true },
              orderBy: { sortOrder: 'asc' },
              ...(loadAll ? {} : { take: 4 }),
              select: {
                id: true,
                name: true,
                slug: true,
                priceRubles: true,
                priceKopecks: true,
                weightGrams: true,
                kcal: true,
                protein: true,
                fat: true,
                carbs: true,
                imageUrl: true,
                isNew: true,
                description: true,
              },
            },
          },
        },
      },
    });

    return cats.map((cat) => ({
      ...cat,
      subcategories: cat.subcategories.map((sub) => ({
        ...sub,
        products: sub.products.map((p) => this.addComputedPrice(p)),
      })),
    }));
  }

  async findProducts(query: ProductsQueryDto) {
    const where: any = { active: true };

    if (query.subcategory) {
      const sub = await this.prisma.subcategory.findFirst({
        where: { slug: query.subcategory },
      });
      if (sub) {
        where.subcategoryId = sub.id;
      }
    } else if (query.category) {
      const cat = await this.prisma.category.findUnique({
        where: { slug: query.category },
      });
      if (cat) {
        const subIds = (
          await this.prisma.subcategory.findMany({
            where: { categoryId: cat.id },
            select: { id: true },
          })
        ).map((s) => s.id);
        where.subcategoryId = { in: subIds };
      }
    }

    if (query.search) {
      const normalized = normalizeSearchText(query.search);
      where.OR = [
        { name: { contains: normalized, mode: 'insensitive' } },
        { description: { contains: normalized, mode: 'insensitive' } },
      ];
    }

    if (query.isNew === 'true') {
      where.isNew = true;
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        subcategory: {
          select: {
            name: true,
            slug: true,
            category: { select: { name: true, slug: true } },
          },
        },
      },
    });

    return products.map((p) => this.addComputedPrice(p));
  }

  async findActivePromotions() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { startsAt: 'desc' },
    });
  }

  async findProductBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        subcategory: {
          select: {
            name: true,
            slug: true,
            category: { select: { name: true, slug: true } },
          },
        },
      },
    });

    if (!product || !product.active) {
      throw new NotFoundException('Товар не найден');
    }

    return this.addComputedPrice(product);
  }
}
