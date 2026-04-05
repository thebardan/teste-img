import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { DriveSyncService, QUEUE_DRIVE_SYNC } from './drive-sync.service'

@Processor(QUEUE_DRIVE_SYNC)
export class DriveSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(DriveSyncProcessor.name)
  constructor(private readonly syncService: DriveSyncService) { super() }
  async process(job: Job): Promise<void> {
    this.logger.log(`Processing drive sync job ${job.id}`)
    await this.syncService.runFullSync()
  }
}
