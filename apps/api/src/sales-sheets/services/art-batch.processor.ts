import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { ArtComposerService } from './art-composer.service'
import { QUEUE_GENERATION } from '../../queue/queue.constants'

interface ArtBatchJobData {
  jobId: string
  salesSheetId: string
  count: number
  refinementPrompt?: string
}

@Processor(QUEUE_GENERATION)
export class ArtBatchProcessor extends WorkerHost {
  private readonly logger = new Logger(ArtBatchProcessor.name)

  constructor(private artComposer: ArtComposerService) {
    super()
  }

  async process(job: Job<ArtBatchJobData>): Promise<void> {
    if (job.name !== 'art-batch') return
    const { jobId, salesSheetId, count, refinementPrompt } = job.data
    this.logger.log(`Processing art-batch job=${jobId} sheet=${salesSheetId} count=${count}`)
    await this.artComposer.processBatchJob(jobId, salesSheetId, count, refinementPrompt)
  }
}
