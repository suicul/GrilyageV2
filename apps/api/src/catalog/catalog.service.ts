import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsQueryDto } from './dto/products-query.dto';
import { normalizeSearchText } from '@grilyage/shared';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCategories() {
    return this.prisma.category.findMany({
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
              take: 4,
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
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

    return this.prisma.product.findMany({
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
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
