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
      // Single-query join via Prisma relation filter — avoids a separate subcategory lookup.
      where.subcategory = { slug: query.subcategory };
    } else if (query.category) {
      // Same: Prisma flattens this into a JOIN, no extra query needed.
      where.subcategory = { category: { slug: query.category } };
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
