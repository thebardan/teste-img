import {
  Controller, Get, Post, Param, Query, Body,
  UseInterceptors, UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @Body('bestOn') bestOn: 'DARK' | 'LIGHT' | 'COLORED' | 'ANY' = 'ANY',
    @Body('description') description?: string,
  ) {
    return this.service.uploadAsset(file, name, bestOn, description)
  }
}
