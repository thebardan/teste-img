import { Controller, Get, Param, Query } from '@nestjs/common'
import { ProductsService } from './products.service'
import type { ProductFiltersDto } from './dto/product-filters.dto'

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductFiltersDto) {
    return this.productsService.findAll(query)
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
