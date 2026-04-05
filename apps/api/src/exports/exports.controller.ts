import { Controller, Post, Get, Param } from '@nestjs/common'
import { ExportsService } from './exports.service'

@Controller('exports')
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Post('presentation/:id/pptx')
  exportPresentationPptx(@Param('id') id: string) {
    return this.service.exportPresentationPptx(id)
  }

  @Post('presentation/:id/pdf')
  exportPresentationPdf(@Param('id') id: string) {
    return this.service.exportPresentationPdf(id)
  }

  @Post('sales-sheet/:id/pdf')
  exportSalesSheetPdf(@Param('id') id: string) {
    return this.service.exportSalesSheetPdf(id)
  }

  @Get('artifact/:id/download')
  getDownloadUrl(@Param('id') id: string) {
    return this.service.getDownloadUrl(id)
  }

  @Get('presentation/:id/artifacts')
  listPresentationArtifacts(@Param('id') id: string) {
    return this.service.listArtifactsForPresentation(id)
  }

  @Get('sales-sheet/:id/artifacts')
  listSalesSheetArtifacts(@Param('id') id: string) {
    return this.service.listArtifactsForSalesSheet(id)
  }
}
