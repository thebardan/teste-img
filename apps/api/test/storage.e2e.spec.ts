import * as request from 'supertest'
import { StorageController } from '../src/storage/storage.controller'
import { StorageService } from '../src/storage/storage.service'
import { bootstrap, close, makePrismaMock, type E2EContext } from './e2e-setup'

describe('E2E /api/storage', () => {
  let ctx: E2EContext
  const mockStorage = {
    getBuffer: jest.fn(),
    getPresignedUrl: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    ctx = await bootstrap({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: mockStorage }],
      prisma: makePrismaMock(),
    })
  })

  afterEach(async () => { await close(ctx) })

  it('GET /storage/url/:key returns presigned URL', async () => {
    mockStorage.getPresignedUrl.mockResolvedValue('https://minio/sig')
    const res = await request(ctx.app.getHttpServer())
      .get('/api/storage/url/art/foo.png?expiresIn=120')
      .expect(200)
    expect(res.body.url).toBe('https://minio/sig')
    expect(res.body.expiresIn).toBe(120)
  })

  it('GET /storage/url/:key 404 when key missing', async () => {
    mockStorage.getPresignedUrl.mockRejectedValue(new Error('not found'))
    await request(ctx.app.getHttpServer())
      .get('/api/storage/url/missing.png')
      .expect(404)
  })

  it('GET /storage/stream/:key streams image bytes with correct mime', async () => {
    mockStorage.getBuffer.mockResolvedValue(Buffer.from('PNGDATA'))
    const res = await request(ctx.app.getHttpServer())
      .get('/api/storage/stream/art/x.png')
      .expect(200)
    expect(res.headers['content-type']).toBe('image/png')
    expect(res.body.toString()).toBe('PNGDATA')
  })

  it('GET /storage/stream/:key 404 on failure', async () => {
    mockStorage.getBuffer.mockRejectedValue(new Error('gone'))
    await request(ctx.app.getHttpServer())
      .get('/api/storage/stream/missing')
      .expect(404)
  })

  it('clamps expiresIn to max 86400', async () => {
    mockStorage.getPresignedUrl.mockResolvedValue('https://minio/x')
    const res = await request(ctx.app.getHttpServer())
      .get('/api/storage/url/k?expiresIn=99999999')
      .expect(200)
    expect(res.body.expiresIn).toBe(86400)
  })

  it('clamps expiresIn to min 60', async () => {
    mockStorage.getPresignedUrl.mockResolvedValue('https://minio/x')
    const res = await request(ctx.app.getHttpServer())
      .get('/api/storage/url/k?expiresIn=1')
      .expect(200)
    expect(res.body.expiresIn).toBe(60)
  })
})
