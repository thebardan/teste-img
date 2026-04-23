import { Module } from '@nestjs/common'
import { SalesSheetsController } from './sales-sheets.controller'
import { SalesSheetsService } from './sales-sheets.service'
import { ArtComposerService } from './services/art-composer.service'
import { AiModule } from '../ai/ai.module'
import { StorageModule } from '../storage/storage.module'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [AiModule, StorageModule, UsersModule],
  controllers: [SalesSheetsController],
  providers: [SalesSheetsService, ArtComposerService],
  exports: [SalesSheetsService, ArtComposerService],
})
export class SalesSheetsModule {}
