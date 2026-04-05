import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import type { Env } from '../config/env'
import { IS_PUBLIC_KEY } from './public.decorator'

/**
 * Validates the X-Api-Key header against API_SECRET.
 * Skipped for routes decorated with @Public().
 * In development (NODE_ENV=development) with no API_SECRET set, the guard passes through.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private config: ConfigService<Env>,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isPublic) return true

    const secret = this.config.get<string>('API_SECRET')
    const isDev = this.config.get<string>('NODE_ENV') === 'development'

    // No secret configured — allow in dev, deny in production
    if (!secret) {
      if (isDev) return true
      throw new UnauthorizedException('API_SECRET not configured')
    }

    const req = ctx.switchToHttp().getRequest<Request>()
    const key = req.headers['x-api-key'] as string | undefined

    if (!key || key !== secret) {
      throw new UnauthorizedException('Invalid or missing API key')
    }

    return true
  }
}
