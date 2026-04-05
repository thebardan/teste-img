import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ApiKeyGuard } from './api-key.guard'
import { RolesGuard } from './roles.guard'

@Module({
  providers: [
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
