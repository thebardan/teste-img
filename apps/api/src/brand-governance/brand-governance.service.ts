import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

const DEFAULT_TONE = { tone: 'profissional, claro e persuasivo', voice: 'especialista de produto Multilaser' }
const DEFAULT_CTAS = [
  'Compre agora e economize',
  'Adquira na loja mais próxima',
  'Leve para casa hoje',
  'Aproveite a oferta',
]

export interface ClientBrandProfile {
  voice?: string
  forbiddenTerms?: string[]
  requiredDisclaimers?: string[]
  toneOverride?: string
}

@Injectable()
export class BrandGovernanceService {
  constructor(private prisma: PrismaClient) {}

  // ─── Tone presets ──────────────────────────────────────────────────────────

  async getToneForCategory(category: string): Promise<{ tone: string; voice: string }> {
    const key = category.toLowerCase()
    const preset = await this.prisma.tonePreset.findUnique({ where: { category: key } })
    if (preset && preset.isActive) return { tone: preset.tone, voice: preset.voice }
    // Try partial match
    const all = await this.prisma.tonePreset.findMany({ where: { isActive: true } })
    const partial = all.find((p) => key.includes(p.category) || p.category.includes(key))
    if (partial) return { tone: partial.tone, voice: partial.voice }
    return DEFAULT_TONE
  }

  listTonePresets() {
    return this.prisma.tonePreset.findMany({ orderBy: { category: 'asc' } })
  }

  upsertTone(category: string, data: { tone: string; voice: string; isActive?: boolean }) {
    return this.prisma.tonePreset.upsert({
      where: { category: category.toLowerCase() },
      create: { category: category.toLowerCase(), ...data },
      update: data,
    })
  }

  deleteTone(id: string) {
    return this.prisma.tonePreset.delete({ where: { id } })
  }

  // ─── Channel CTAs ──────────────────────────────────────────────────────────

  async getCtasForChannel(channel: string): Promise<string[]> {
    const preset = await this.prisma.channelCtaPreset.findUnique({ where: { channel } })
    if (preset && preset.isActive && Array.isArray(preset.ctas)) {
      return (preset.ctas as any[]).filter((x) => typeof x === 'string')
    }
    return DEFAULT_CTAS
  }

  listChannelCtaPresets() {
    return this.prisma.channelCtaPreset.findMany({ orderBy: { channel: 'asc' } })
  }

  upsertChannelCtas(channel: string, data: { ctas: string[]; isActive?: boolean }) {
    return this.prisma.channelCtaPreset.upsert({
      where: { channel },
      create: { channel, ctas: data.ctas as any, isActive: data.isActive ?? true },
      update: data as any,
    })
  }

  deleteChannelCtas(id: string) {
    return this.prisma.channelCtaPreset.delete({ where: { id } })
  }

  // ─── Client brand profile ──────────────────────────────────────────────────

  async getClientProfile(clientId: string): Promise<ClientBrandProfile | null> {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } })
    if (!client) return null
    return (client.brandProfile as any) ?? null
  }

  async updateClientProfile(clientId: string, profile: ClientBrandProfile) {
    return this.prisma.client.update({
      where: { id: clientId },
      data: { brandProfile: profile as any },
    })
  }
}
