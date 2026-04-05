import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { PresentationsService } from './presentations.service'
import type { CreatePresentationDto } from './dto/create-presentation.dto'

@Controller('presentations')
export class PresentationsController {
  constructor(private readonly service: PresentationsService) {}

  @Get()
  findAll(@Query('page') page?: string) {
    return this.service.findAll(Number(page ?? 1))
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post('generate')
  generate(@Body() dto: CreatePresentationDto) {
    return this.service.generate(dto)
  }
}
