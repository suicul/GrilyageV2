import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ProductsQueryDto } from './dto/products-query.dto';

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  async findAllCategories(@Query('all') all?: string) {
    return this.catalogService.findAllCategories(all === 'true');
  }

  @Get('products')
  async findProducts(@Query() query: ProductsQueryDto) {
    return this.catalogService.findProducts(query);
  }

  @Get('products/:slug')
  async findProductBySlug(@Param('slug') slug: string) {
    return this.catalogService.findProductBySlug(slug);
  }

  @Get('subcategories')
  async findAllSubcategories() {
    return this.catalogService.findAllSubcategories();
  }

  @Get('promotions')
  async findActivePromotions() {
    return this.catalogService.findActivePromotions();
  }
}
