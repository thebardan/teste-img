import { Controller, Post, Param } from '@nestjs/common'
import { QAService } from './qa.service'

@Controller('qa')
export class QAController {
  constructor(private readonly service: QAService) {}

  @Post('sales-sheet/:id')
  checkSalesSheet(@Param('id') id: string) {
    return this.service.checkSalesSheet(id)
  }

  @Post('presentation/:id')
  checkPresentation(@Param('id') id: string) {
    return this.service.checkPresentation(id)
  }

  @Post('sales-sheet/:id/art')
  checkSalesSheetArt(@Param('id') id: string) {
    return this.service.checkSalesSheetArt(id)
  }
}
