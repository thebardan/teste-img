import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { ApiKeyGuard } from './api-key.guard'

function makeCtx(headers: Record<string, string>, isPublic = false): ExecutionContext {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(isPublic) } as any
  const request = { headers }
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
    _reflector: reflector,
  } as any
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard
  let reflector: Reflector
  let configService: ConfigService

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any
    configService = { get: jest.fn() } as any
    guard = new ApiKeyGuard(reflector as Reflector, configService as any)
  })

  it('passes @Public() routes without key check', () => {
    ;(reflector.getAllAndOverride as jest.Mock).mockReturnValue(true)
    ;(configService.get as jest.Mock).mockReturnValue('secret')
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as any

    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('passes when API_SECRET is not set in development', () => {
    ;(reflector.getAllAndOverride as jest.Mock).mockReturnValue(false)
    ;(configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'API_SECRET') return undefined
      if (key === 'NODE_ENV') return 'development'
    })
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as any

    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('throws Unauthorized when API_SECRET not configured in production', () => {
    ;(reflector.getAllAndOverride as jest.Mock).mockReturnValue(false)
    ;(configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'API_SECRET') return undefined
      if (key === 'NODE_ENV') return 'production'
    })
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as any

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException)
  })

  it('passes with valid API key', () => {
    ;(reflector.getAllAndOverride as jest.Mock).mockReturnValue(false)
    ;(configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'API_SECRET') return 'my-secret'
      if (key === 'NODE_ENV') return 'production'
    })
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-api-key': 'my-secret' } }),
      }),
    } as any

    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('throws Unauthorized with wrong API key', () => {
    ;(reflector.getAllAndOverride as jest.Mock).mockReturnValue(false)
    ;(configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'API_SECRET') return 'my-secret'
      if (key === 'NODE_ENV') return 'production'
    })
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-api-key': 'wrong' } }),
      }),
    } as any

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException)
  })
})
