import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SalesSheetsController } from './sales-sheets.controller'
import { SalesSheetsService } from './sales-sheets.service'
import { ArtComposerService } from './services/art-composer.service'
import { ArtBatchProcessor } from './services/art-batch.processor'
import { AiModule } from '../ai/ai.module'
import { StorageModule } from '../storage/storage.module'
import { UsersModule } from '../users/users.module'
import { QUEUE_GENERATION } from '../queue/queue.constants'

@Module({
  imports: [
    AiModule,
    StorageModule,
    UsersModule,
    BullModule.registerQueue({ name: QUEUE_GENERATION }),
  ],
  controllers: [SalesSheetsController],
  providers: [SalesSheetsService, ArtComposerService, ArtBatchProcessor],
  exports: [SalesSheetsService, ArtComposerService],
})
export class SalesSheetsModule {}
