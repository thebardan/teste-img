import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import type { Queue } from 'bullmq'
import { QUEUE_GENERATION, QUEUE_EXPORT } from './queue.module'

export interface QueueStats {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_GENERATION) private generationQueue: Queue,
    @InjectQueue(QUEUE_EXPORT) private exportQueue: Queue,
  ) {}

  async getStats(): Promise<QueueStats[]> {
    const queues = [
      { name: QUEUE_GENERATION, queue: this.generationQueue },
      { name: QUEUE_EXPORT, queue: this.exportQueue },
    ]

    return Promise.all(
      queues.map(async ({ name, queue }) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ])
        const isPaused = await queue.isPaused()
        return { name, waiting, active, completed, failed, delayed, paused: isPaused }
      }),
    )
  }

  async getFailedJobs(queueName: string, start = 0, end = 20) {
    const queue =
      queueName === QUEUE_GENERATION ? this.generationQueue : this.exportQueue
    const jobs = await queue.getFailed(start, end)
    return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      timestamp: j.timestamp,
    }))
  }

  async retryFailed(queueName: string, jobId: string) {
    const queue =
      queueName === QUEUE_GENERATION ? this.generationQueue : this.exportQueue
    const job = await queue.getJob(jobId)
    if (!job) throw new Error(`Job ${jobId} not found in queue ${queueName}`)
    await job.retry()
    return { retried: jobId }
  }
}
