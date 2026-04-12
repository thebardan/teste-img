import { Module } from '@nestjs/common'
import { ExportsController } from './exports.controller'
import { ExportsService } from './exports.service'
import { PptxComposerService } from './services/pptx-composer.service'
import { PdfComposerService } from './services/pdf-composer.service'
import { QrCodeService } from './services/qrcode.service'
import { PngComposerService } from './services/png-composer.service'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [ExportsController],
  providers: [ExportsService, PptxComposerService, PdfComposerService, QrCodeService, PngComposerService],
  exports: [ExportsService, QrCodeService, PngComposerService],
})
export class ExportsModule {}
