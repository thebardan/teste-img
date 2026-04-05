import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env'
import { DatabaseModule } from './database/database.module'
import { QueueModule } from './queue/queue.module'
import { StorageModule } from './storage/storage.module'
import { HealthModule } from './health/health.module'
import { ProductsModule } from './products/products.module'
import { BrandAssetsModule } from './brand-assets/brand-assets.module'
import { AiModule } from './ai/ai.module'
import { SalesSheetsModule } from './sales-sheets/sales-sheets.module'
import { PresentationsModule } from './presentations/presentations.module'
import { ClientsModule } from './clients/clients.module'

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
    AiModule,
    SalesSheetsModule,
    PresentationsModule,
    ClientsModule,
  ],
})
export class AppModule {}
