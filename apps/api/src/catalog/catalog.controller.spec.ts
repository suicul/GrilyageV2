import { Test, TestingModule } from '@nestjs/testing';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

describe('CatalogController', () => {
  let controller: CatalogController;

  const mockService = {
    findAllCategories: jest.fn(),
    findProducts: jest.fn(),
    findProductBySlug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [{ provide: CatalogService, useValue: mockService }],
    }).compile();

    controller = module.get<CatalogController>(CatalogController);
    jest.clearAllMocks();
  });

  it('GET /categories should return all categories', async () => {
    const expected = [{ name: 'Новинки' }];
    mockService.findAllCategories.mockResolvedValue(expected);

    const result = await controller.findAllCategories();
    expect(result).toEqual(expected);
  });

  it('GET /products should return filtered products', async () => {
    const expected = [{ name: 'Паста' }];
    mockService.findProducts.mockResolvedValue(expected);

    const result = await controller.findProducts({ search: 'паста' });
    expect(result).toEqual(expected);
    expect(mockService.findProducts).toHaveBeenCalledWith({ search: 'паста' });
  });

  it('GET /products/:slug should return single product', async () => {
    const expected = { name: 'Паста' };
    mockService.findProductBySlug.mockResolvedValue(expected);

    const result = await controller.findProductBySlug('pasta');
    expect(result).toEqual(expected);
  });
});
