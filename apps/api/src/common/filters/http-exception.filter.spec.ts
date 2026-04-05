import { HttpException, HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common'
import { HttpExceptionFilter } from './http-exception.filter'
import type { ArgumentsHost } from '@nestjs/common'

function makeHost(url = '/api/test', method = 'GET', requestId?: string) {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const response = { status }
  const request = {
    method,
    url,
    headers: requestId ? { 'x-request-id': requestId } : {},
  }
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost
  return { host, json, status }
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter

  beforeEach(() => {
    filter = new HttpExceptionFilter()
  })

  it('formats HttpException with status + message', () => {
    const { host, status, json } = makeHost('/api/products', 'GET', 'req-123')
    filter.catch(new NotFoundException('Product not found'), host)
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Product not found',
        requestId: 'req-123',
        path: '/api/products',
      }),
    )
  })

  it('formats BadRequestException with array message', () => {
    const { host, json } = makeHost()
    filter.catch(
      new BadRequestException({ message: ['field is required'], error: 'Bad Request' }),
      host,
    )
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['field is required'],
      }),
    )
  })

  it('formats unknown Error as 500', () => {
    const { host, status } = makeHost()
    filter.catch(new Error('Unexpected failure'), host)
    expect(status).toHaveBeenCalledWith(500)
  })

  it('uses "unknown" when no x-request-id header', () => {
    const { host, json } = makeHost('/api/test', 'GET', undefined)
    filter.catch(new HttpException('Test', 400), host)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'unknown' }),
    )
  })
})
