import { Injectable, NestMiddleware } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

/**
 * Attaches a unique X-Request-Id to every request.
 * Respects an incoming x-request-id header if already present (e.g., from a load balancer).
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID()
    req.headers['x-request-id'] = requestId
    res.setHeader('X-Request-Id', requestId)
    next()
  }
}
