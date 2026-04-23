import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
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
import { TemplatesModule } from './templates/templates.module'
import { ExportsModule } from './exports/exports.module'
import { ApprovalsModule } from './approvals/approvals.module'
import { QAModule } from './qa/qa.module'
import { DriveSyncModule } from './drive-sync/drive-sync.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { NotificationsModule } from './notifications/notifications.module'
import { BrandGovernanceModule } from './brand-governance/brand-governance.module'
import { RequestIdMiddleware } from './common/middleware/request-id.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      ignoreEnvFile: false,
    }),
    AuthModule,
    UsersModule,
    NotificationsModule,
    BrandGovernanceModule,
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
    TemplatesModule,
    ExportsModule,
    ApprovalsModule,
    QAModule,
    DriveSyncModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*')
  }
}
