import { RequestIdMiddleware } from './request-id.middleware'
import type { Request, Response, NextFunction } from 'express'

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware

  beforeEach(() => {
    middleware = new RequestIdMiddleware()
  })

  it('generates a new request ID when none is present', () => {
    const req = { headers: {} } as unknown as Request
    const setHeader = jest.fn()
    const res = { setHeader } as unknown as Response
    const next: NextFunction = jest.fn()

    middleware.use(req, res, next)

    expect(req.headers['x-request-id']).toBeDefined()
    expect(typeof req.headers['x-request-id']).toBe('string')
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', req.headers['x-request-id'])
    expect(next).toHaveBeenCalled()
  })

  it('preserves incoming x-request-id header', () => {
    const req = { headers: { 'x-request-id': 'existing-id' } } as unknown as Request
    const setHeader = jest.fn()
    const res = { setHeader } as unknown as Response
    const next: NextFunction = jest.fn()

    middleware.use(req, res, next)

    expect(req.headers['x-request-id']).toBe('existing-id')
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'existing-id')
  })
})
