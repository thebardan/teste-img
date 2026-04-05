import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env'
import { DatabaseModule } from './database/database.module'
import { QueueModule } from './queue/queue.module'
import { StorageModule } from './storage/storage.module'
import { HealthModule } from './health/health.module'
import { ProductsModule } from './products/products.module'
import { BrandAssetsModule } from './brand-assets/brand-assets.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      ignoreEnvFile: false,
    }),
    DatabaseModule,
    QueueModule,
    StorageModule,
    HealthModule,
    ProductsModule,
    BrandAssetsModule,
  ],
})
export class AppModule {}
