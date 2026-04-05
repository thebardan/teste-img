import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '@prisma/client'
import { RolesGuard } from './roles.guard'

function makeCtx(role: string | undefined, requiredRoles: UserRole[] | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  }
  const ctx = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        headers: role ? { 'x-user-role': role } : {},
      }),
    }),
    _reflector: reflector,
  } as any
  return { ctx, reflector }
}

describe('RolesGuard', () => {
  let guard: RolesGuard

  beforeEach(() => {
    guard = new RolesGuard({ getAllAndOverride: jest.fn() } as any)
  })

  it('passes when no @Roles() decorator is present', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any
    guard = new RolesGuard(reflector)
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as any
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('passes when role matches required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as any
    guard = new RolesGuard(reflector)
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-user-role': 'ADMIN' } }),
      }),
    } as any
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('passes when one of multiple required roles matches', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([UserRole.ADMIN, UserRole.EDITOR]),
    } as any
    guard = new RolesGuard(reflector)
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-user-role': 'EDITOR' } }),
      }),
    } as any
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('throws Forbidden when role does not match', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as any
    guard = new RolesGuard(reflector)
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-user-role': 'VIEWER' } }),
      }),
    } as any
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })

  it('throws Forbidden when no role header is present', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as any
    guard = new RolesGuard(reflector)
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as any
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })
})
