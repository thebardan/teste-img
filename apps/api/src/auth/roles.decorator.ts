import { SetMetadata } from '@nestjs/common'
import { UserRole } from '@prisma/client'

export const ROLES_KEY = 'roles'
/** Restrict a route to one or more user roles */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
