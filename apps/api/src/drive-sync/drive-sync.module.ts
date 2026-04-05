import { Module } from '@nestjs/common'
import { DriveSyncController } from './drive-sync.controller'
import { DriveSyncService } from './drive-sync.service'
import { DriveSyncProcessor } from './drive-sync.processor'
import { GoogleDriveService } from './services/google-drive.service'
import { EmbeddingService } from './services/embedding.service'
import { VectorMatchService } from './services/vector-match.service'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [StorageModule],
  controllers: [DriveSyncController],
  providers: [DriveSyncService, DriveSyncProcessor, GoogleDriveService, EmbeddingService, VectorMatchService],
  exports: [DriveSyncService],
})
export class DriveSyncModule {}
