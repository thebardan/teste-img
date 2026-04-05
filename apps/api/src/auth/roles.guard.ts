import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '@prisma/client'
import type { Request } from 'express'
import { ROLES_KEY } from './roles.decorator'

/**
 * Enforces @Roles() constraints.
 * Reads x-user-role header (set by the Next.js BFF after session lookup).
 * If no @Roles() decorator is present, the route is accessible by any authenticated caller.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!requiredRoles || requiredRoles.length === 0) return true

    const req = ctx.switchToHttp().getRequest<Request>()
    const roleHeader = req.headers['x-user-role'] as string | undefined
    const userRole = roleHeader as UserRole | undefined

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Required role(s): ${requiredRoles.join(', ')}. Your role: ${userRole ?? 'none'}`,
      )
    }

    return true
  }
}
