import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common'
import { SalesSheetsService } from './sales-sheets.service'
import type { CreateSalesSheetDto } from './dto/create-sales-sheet.dto'

@Controller('sales-sheets')
export class SalesSheetsController {
  constructor(private readonly service: SalesSheetsService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.findAll(Number(page ?? 1), Number(pageSize ?? 20))
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post('generate')
  generate(@Body() dto: CreateSalesSheetDto) {
    return this.service.generate(dto)
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.service.updateStatus(id, status)
  }
}
