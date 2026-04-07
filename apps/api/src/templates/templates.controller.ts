import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { TemplatesService } from './templates.service'
import { TemplateType } from '@prisma/client'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { CreateVariantDto } from './dto/create-variant.dto'

@Controller('templates')
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  findAll(
    @Query('type') type?: TemplateType,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.findAll(type, activeOnly === 'true')
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }

  @Post(':id/variants')
  addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.service.addVariant(id, dto)
  }

  @Delete(':id/variants/:variantId')
  removeVariant(@Param('id') id: string, @Param('variantId') variantId: string) {
    return this.service.removeVariant(id, variantId)
  }
}
