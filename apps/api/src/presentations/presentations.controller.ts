import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { PresentationsService } from './presentations.service'
import { CreatePresentationDto } from './dto/create-presentation.dto'
import { CurrentUser, type RequestUser } from '../auth/current-user.decorator'

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
  generate(@Body() dto: CreatePresentationDto, @CurrentUser() caller: RequestUser | null) {
    return this.service.generate(dto, caller?.email)
  }

  @Patch(':id/slides/:order/content')
  updateSlideContent(
    @Param('id') id: string,
    @Param('order') order: string,
    @Body() body: Record<string, any>,
  ) {
    return this.service.updateSlideContent(id, Number(order), body)
  }

  @Post(':id/slides/:order/regenerate')
  regenerateSlide(@Param('id') id: string, @Param('order') order: string) {
    return this.service.regenerateSlide(id, Number(order))
  }

  @Post(':id/slides/reorder')
  reorderSlides(@Param('id') id: string, @Body('orderedIds') orderedIds: string[]) {
    return this.service.reorderSlides(id, orderedIds)
  }

  @Post(':id/slides')
  addSlide(
    @Param('id') id: string,
    @Body() body: { type: any; afterOrder?: number },
  ) {
    return this.service.addSlide(id, body.type, body.afterOrder)
  }

  @Delete(':id/slides/:order')
  removeSlide(@Param('id') id: string, @Param('order') order: string) {
    return this.service.removeSlide(id, Number(order))
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
