import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env'
import { DatabaseModule } from './database/database.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      ignoreEnvFile: false,
    }),
    DatabaseModule,
  ],
})
export class AppModule {}
