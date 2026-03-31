import { Global, Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env'

export const QUEUE_GENERATION = 'generation'
export const QUEUE_EXPORT = 'export'

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => ({
        connection: {
          url: config.get('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_GENERATION },
      { name: QUEUE_EXPORT },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
