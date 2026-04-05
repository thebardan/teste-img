import { Module } from '@nestjs/common'
import { SalesSheetsController } from './sales-sheets.controller'
import { SalesSheetsService } from './sales-sheets.service'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [AiModule],
  controllers: [SalesSheetsController],
  providers: [SalesSheetsService],
  exports: [SalesSheetsService],
})
export class SalesSheetsModule {}
