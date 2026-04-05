import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

interface ErrorResponse {
  statusCode: number
  error: string
  message: string | string[]
  requestId: string
  path: string
  timestamp: string
}

/**
 * Global HTTP exception filter.
 * Returns a consistent JSON error envelope and logs server-side errors.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message: string | string[] = 'Internal server error'
    let error = 'Internal Server Error'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const resp = exception.getResponse()
      if (typeof resp === 'string') {
        message = resp
      } else if (typeof resp === 'object' && resp !== null) {
        const r = resp as Record<string, unknown>
        message = (r['message'] as string | string[]) ?? exception.message
        error = (r['error'] as string) ?? exception.name
      }
    } else if (exception instanceof Error) {
      message = exception.message
      this.logger.error(`Unhandled error on ${req.method} ${req.url}: ${exception.stack}`)
    } else {
      this.logger.error(`Unknown exception on ${req.method} ${req.url}: ${String(exception)}`)
    }

    const requestId = (req.headers['x-request-id'] as string) ?? 'unknown'

    if (status >= 500) {
      this.logger.error(`[${requestId}] ${req.method} ${req.url} → ${status}`)
    }

    const body: ErrorResponse = {
      statusCode: status,
      error,
      message,
      requestId,
      path: req.url,
      timestamp: new Date().toISOString(),
    }

    res.status(status).json(body)
  }
}
