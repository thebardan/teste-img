import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { SalesSheetsService } from './sales-sheets.service'
import { ArtComposerService } from './services/art-composer.service'
import { CreateSalesSheetDto } from './dto/create-sales-sheet.dto'
import { CurrentUser, type RequestUser } from '../auth/current-user.decorator'

@Controller('sales-sheets')
export class SalesSheetsController {
  constructor(
    private readonly service: SalesSheetsService,
    private readonly artComposer: ArtComposerService,
  ) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.findAll(Number(page ?? 1), Number(pageSize ?? 20))
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post('generate')
  generate(@Body() dto: CreateSalesSheetDto, @CurrentUser() caller: RequestUser | null) {
    return this.service.generate(dto, caller?.email)
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.service.updateStatus(id, status)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }

  @Post(':id/generate-art')
  generateArt(@Param('id') id: string, @Body() body: { prompt?: string }) {
    return this.artComposer.generateArt(id, body.prompt)
  }

  @Post(':id/generate-art-batch')
  generateArtBatch(
    @Param('id') id: string,
    @Body() body: { count?: number; prompt?: string },
  ) {
    return this.artComposer.generateBatch(id, body.count ?? 3, body.prompt)
  }

  @Patch(':id/content')
  updateContent(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.updateContent(id, body)
  }

  @Post(':id/regenerate-field')
  regenerateField(
    @Param('id') id: string,
    @Body() body: { field: string; guidance?: string },
  ) {
    return this.service.regenerateField(id, body.field, body.guidance)
  }

  @Post(':id/more-variations')
  generateMoreVariations(
    @Param('id') id: string,
    @Body() body: { guidance?: string },
  ) {
    return this.service.generateMoreVariations(id, body.guidance)
  }
}
