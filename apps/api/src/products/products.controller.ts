import { Controller, Get, Param, Query } from '@nestjs/common'
import { ProductsService } from './products.service'
import type { ProductFiltersDto } from './dto/product-filters.dto'

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductFiltersDto) {
    return this.productsService.findAll({
      ...query,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
      isActive:
        query.isActive !== undefined
          ? query.isActive === (true as any) || query.isActive === ('true' as any)
          : undefined,
    })
  }

  @Get('categories')
  getCategories() {
    return this.productsService.getCategories()
  }

  @Get('brands')
  getBrands() {
    return this.productsService.getBrands()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id)
  }
}
