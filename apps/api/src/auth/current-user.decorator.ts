import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

export interface RequestUser {
  email: string
  role: string
}

/**
 * Extracts the caller's identity from x-user-email / x-user-role headers.
 * Headers are populated by the Next.js BFF layer which owns the session.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | null => {
    const req = ctx.switchToHttp().getRequest<Request>()
    const email = req.headers['x-user-email'] as string | undefined
    const role = req.headers['x-user-role'] as string | undefined
    if (!email) return null
    return { email, role: role ?? 'VIEWER' }
  },
)
