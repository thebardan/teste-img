import { Global, Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env'
import { QueueController } from './queue.controller'
import { QueueService } from './queue.service'
import { QUEUE_GENERATION, QUEUE_EXPORT, QUEUE_DRIVE_SYNC } from './queue.constants'

export { QUEUE_GENERATION, QUEUE_EXPORT, QUEUE_DRIVE_SYNC }

/** Default job options applied to every queue */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
}

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => ({
        connection: {
          url: config.get('REDIS_URL'),
        },
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_GENERATION },
      { name: QUEUE_EXPORT },
      { name: QUEUE_DRIVE_SYNC },
    ),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
