import * as request from 'supertest'
import { BrandGovernanceController } from '../src/brand-governance/brand-governance.controller'
import { BrandGovernanceService } from '../src/brand-governance/brand-governance.service'
import { bootstrap, close, makePrismaMock, type E2EContext } from './e2e-setup'

describe('E2E /api/brand-governance', () => {
  let ctx: E2EContext

  beforeEach(async () => {
    const prisma = makePrismaMock()
    ctx = await bootstrap({
      controllers: [BrandGovernanceController],
      providers: [BrandGovernanceService],
      prisma,
    })
  })

  afterEach(async () => {
    await close(ctx)
  })

  // ─── Tones ─────────────────────────────────────────────────────────────────

  it('GET /tones lists presets ordered by category', async () => {
    ctx.prisma.tonePreset.findMany.mockResolvedValue([
      { id: '1', category: 'audio', tone: 'sensorial', voice: 'maestro', isActive: true },
      { id: '2', category: 'gamer', tone: 'intenso', voice: 'guerreiro', isActive: true },
    ])
    const res = await request(ctx.app.getHttpServer())
      .get('/api/brand-governance/tones')
      .expect(200)
    expect(res.body).toHaveLength(2)
    expect(ctx.prisma.tonePreset.findMany).toHaveBeenCalledWith({ orderBy: { category: 'asc' } })
  })

  it('PUT /tones/:category upserts + lowercases key', async () => {
    ctx.prisma.tonePreset.upsert.mockResolvedValue({
      id: '1', category: 'gamer', tone: 'X', voice: 'Y', isActive: true,
    })
    await request(ctx.app.getHttpServer())
      .put('/api/brand-governance/tones/GAMER')
      .send({ tone: 'X', voice: 'Y' })
      .expect(200)
    expect(ctx.prisma.tonePreset.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { category: 'gamer' },
    }))
  })

  it('DELETE /tones/:id removes preset', async () => {
    ctx.prisma.tonePreset.delete.mockResolvedValue({ id: '1' })
    await request(ctx.app.getHttpServer())
      .delete('/api/brand-governance/tones/1')
      .expect(200)
    expect(ctx.prisma.tonePreset.delete).toHaveBeenCalledWith({ where: { id: '1' } })
  })

  // ─── Channel CTAs ──────────────────────────────────────────────────────────

  it('GET /channel-ctas lists presets', async () => {
    ctx.prisma.channelCtaPreset.findMany.mockResolvedValue([
      { id: '1', channel: 'Varejo', ctas: ['X', 'Y'], isActive: true },
    ])
    const res = await request(ctx.app.getHttpServer())
      .get('/api/brand-governance/channel-ctas')
      .expect(200)
    expect(res.body[0].ctas).toEqual(['X', 'Y'])
  })

  it('PUT /channel-ctas/:channel upserts', async () => {
    ctx.prisma.channelCtaPreset.upsert.mockResolvedValue({})
    await request(ctx.app.getHttpServer())
      .put('/api/brand-governance/channel-ctas/Varejo')
      .send({ ctas: ['A', 'B'], isActive: true })
      .expect(200)
    expect(ctx.prisma.channelCtaPreset.upsert).toHaveBeenCalled()
  })

  it('DELETE /channel-ctas/:id removes', async () => {
    ctx.prisma.channelCtaPreset.delete.mockResolvedValue({})
    await request(ctx.app.getHttpServer())
      .delete('/api/brand-governance/channel-ctas/1')
      .expect(200)
  })

  // ─── Client profile ────────────────────────────────────────────────────────

  it('GET /clients/:id/profile returns null when client missing', async () => {
    ctx.prisma.client.findUnique.mockResolvedValue(null)
    const res = await request(ctx.app.getHttpServer())
      .get('/api/brand-governance/clients/c-1/profile')
      .expect(200)
    expect(res.body.profile).toBeNull()
  })

  it('GET /clients/:id/profile returns stored profile', async () => {
    ctx.prisma.client.findUnique.mockResolvedValue({
      id: 'c-1',
      brandProfile: { voice: 'corporate', forbiddenTerms: ['barato'] },
    })
    const res = await request(ctx.app.getHttpServer())
      .get('/api/brand-governance/clients/c-1/profile')
      .expect(200)
    expect(res.body.profile).toEqual({ voice: 'corporate', forbiddenTerms: ['barato'] })
  })

  it('PUT /clients/:id/profile writes profile to client', async () => {
    ctx.prisma.client.update.mockResolvedValue({ id: 'c-1' })
    await request(ctx.app.getHttpServer())
      .put('/api/brand-governance/clients/c-1/profile')
      .send({ voice: 'premium', requiredDisclaimers: ['*consulte condições'] })
      .expect(200)
    expect(ctx.prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'c-1' },
      data: { brandProfile: { voice: 'premium', requiredDisclaimers: ['*consulte condições'] } },
    })
  })
})
