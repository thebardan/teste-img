import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { Observable, tap } from 'rxjs'

/**
 * Logs every HTTP request: method, path, status, duration, and request ID.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>()
    const res = ctx.switchToHttp().getResponse<Response>()
    const { method, url } = req
    const requestId = req.headers['x-request-id'] as string | undefined
    const start = Date.now()

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start
          this.logger.log(
            `[${requestId ?? '-'}] ${method} ${url} → ${res.statusCode} (${ms}ms)`,
          )
        },
        error: () => {
          const ms = Date.now() - start
          this.logger.warn(`[${requestId ?? '-'}] ${method} ${url} → ERR (${ms}ms)`)
        },
      }),
    )
  }
}
