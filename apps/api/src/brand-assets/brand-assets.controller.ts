import { Controller, Get, Param, Query } from '@nestjs/common'
import { BrandAssetsService } from './brand-assets.service'

@Controller('brand-assets')
export class BrandAssetsController {
  constructor(private readonly service: BrandAssetsService) {}

  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Get('select-best')
  selectBest(@Query('background') background: 'DARK' | 'LIGHT' | 'COLORED' | 'ANY' = 'ANY') {
    return this.service.selectBest(background)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }
}
