import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CatalogService', () => {
  let service: CatalogService;

  const mockPrisma = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    subcategory: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    jest.clearAllMocks();
  });

  describe('findAllCategories', () => {
    it('should return categories with subcategories and products', async () => {
      const expected = [
        {
          id: 'cat-1',
          name: 'Новинки',
          slug: 'novinki',
          sortOrder: 10,
          imageUrl: null,
          active: true,
          subcategories: [],
        },
      ];
      mockPrisma.category.findMany.mockResolvedValue(expected);

      const result = await service.findAllCategories();
      expect(result).toEqual(expected);
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        include: expect.objectContaining({
          subcategories: expect.anything(),
        }),
      });
    });
  });

  describe('findProducts', () => {
    it('should return filtered products by search', async () => {
      const dbProduct = { id: 'p1', name: 'Паста с курицей', slug: 'pasta-s-kuricej', priceRubles: 410, priceKopecks: 0 };
      mockPrisma.product.findMany.mockResolvedValue([dbProduct]);

      const result = await service.findProducts({ search: 'паста' });
      expect(result).toEqual([{ ...dbProduct, price: 41000 }]);
    });

    it('should filter by isNew flag', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findProducts({ isNew: 'true' });
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isNew: true }),
        }),
      );
    });

    it('should filter by category slug', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.subcategory.findMany.mockResolvedValue([{ id: 'sub-1' }, { id: 'sub-2' }]);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findProducts({ category: 'kulinariya' });
      expect(mockPrisma.product.findMany).toHaveBeenCalled();
    });
  });

  describe('findProductBySlug', () => {
    it('should return product for valid slug', async () => {
      const dbProduct = { id: 'p1', name: 'Паста с курицей', slug: 'pasta-s-kuricej', active: true, priceRubles: 410, priceKopecks: 0 };
      mockPrisma.product.findUnique.mockResolvedValue(dbProduct);

      const result = await service.findProductBySlug('pasta-s-kuricej');
      expect(result).toEqual({ ...dbProduct, price: 41000 });
    });
  });
});
