import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PromptEngineService } from '../ai/prompt-engine/prompt-engine.service'
import { BrandGuardianAgent } from '../ai/agents/brand-guardian.agent'
import type { CreatePresentationDto } from './dto/create-presentation.dto'

const SYSTEM_USER_EMAIL = 'admin@multilaser.com.br'
const FALLBACK_TEMPLATE_ID = 'tpl-deck-corporate'

@Injectable()
export class PresentationsService {
  constructor(
    private prisma: PrismaClient,
    private promptEngine: PromptEngineService,
    private brandGuardian: BrandGuardianAgent,
  ) {}

  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      this.prisma.presentation.findMany({
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { name: true } },
          template: { select: { name: true } },
          author: { select: { name: true } },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            include: { slides: { orderBy: { order: 'asc' } } },
          },
        },
      }),
      this.prisma.presentation.count(),
    ])
    return { data: items, total, page, pageSize }
  }

  async findOne(id: string) {
    const p = await this.prisma.presentation.findUnique({
      where: { id },
      include: {
        client: true,
        template: true,
        author: { select: { id: true, name: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { slides: { orderBy: { order: 'asc' } }, artifacts: true },
        },
        approvals: { include: { approver: { select: { name: true } } } },
      },
    })
    if (!p) throw new NotFoundException(`Presentation ${id} not found`)
    return p
  }

  async generate(dto: CreatePresentationDto) {
    const systemUser = await this.prisma.user.findFirst({ where: { email: SYSTEM_USER_EMAIL } })
    if (!systemUser) throw new Error('System user not found — run seed first')

    const templateId = dto.templateId ?? FALLBACK_TEMPLATE_ID
    const template = await this.prisma.template.findUnique({ where: { id: templateId } })
    if (!template) throw new Error(`Template ${templateId} not found`)

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds } },
      include: { benefits: { take: 3 }, specifications: { take: 4 } },
    })
    if (!products.length) throw new Error('No valid products found')

    const client = dto.clientId
      ? await this.prisma.client.findUnique({ where: { id: dto.clientId } })
      : null

    const productsText = products
      .map((p) => `${p.name} (${p.sku}): ${p.benefits.map((b) => b.text).join(', ')}`)
      .join('\n')

    const structureResult = await this.promptEngine.run('slide-structure', {
      clientName: client?.name ?? 'Cliente',
      products: productsText,
      focus: dto.focus ?? 'benefícios e diferenciais',
      channel: dto.channel ?? 'Varejo',
    })

    const rawSlides: any[] =
      (structureResult.parsedOutput as any)?.slides ?? this.defaultSlides(client?.name, products[0].name)

    const logoSelection = await this.brandGuardian.selectLogo({ background: 'DARK' })

    const enrichedSlides = await Promise.all(
      rawSlides.map(async (slide: any, i: number) => {
        const copyResult = await this.promptEngine.run('slide-copy', {
          slideType: slide.type,
          title: slide.title,
          context: `Produto(s): ${productsText}, Cliente: ${client?.name ?? 'Cliente'}`,
        })
        const enriched = (copyResult.parsedOutput as any) ?? {}
        return {
          order: i,
          content: {
            type: slide.type,
            title: enriched.title ?? slide.title,
            subtitle: enriched.subtitle ?? slide.subtitle,
            body: enriched.body ?? slide.body ?? [],
            cta: slide.cta,
            logoAssetId: logoSelection.logoAssetId,
            layout: { templateId, zones: template.zonesConfig },
          },
        }
      }),
    )

    const title = `${client?.name ?? 'Apresentação'} — ${products.map((p) => p.name).join(', ')}`

    const presentation = await this.prisma.presentation.create({
      data: {
        title,
        status: 'DRAFT',
        clientId: dto.clientId ?? null,
        templateId,
        authorId: systemUser.id,
        focus: dto.focus,
        channel: dto.channel,
        versions: {
          create: {
            versionNumber: 1,
            slides: {
              create: enrichedSlides.map((s) => ({ order: s.order, content: s.content as any })),
            },
          },
        },
      },
      include: {
        client: { select: { name: true } },
        template: { select: { name: true } },
        versions: { include: { slides: { orderBy: { order: 'asc' } } } },
      },
    })
    return presentation
  }

  private defaultSlides(clientName = 'Cliente', productName = 'Produto') {
    return [
      { type: 'cover', title: `Proposta Comercial — ${clientName}`, subtitle: 'Multilaser', body: [], cta: null },
      { type: 'context', title: 'Contexto e Oportunidade', subtitle: null, body: ['Cenário de mercado', 'Encaixe no canal', 'Proposta de valor'], cta: null },
      { type: 'products', title: 'Produtos em Destaque', subtitle: productName, body: ['Especificações', 'Diferenciais', 'Comparativos'], cta: null },
      { type: 'benefits', title: 'Benefícios e Argumentos', subtitle: null, body: ['Argumentos de venda', 'Vantagens competitivas'], cta: null },
      { type: 'closing', title: 'Próximos Passos', subtitle: null, body: ['Resumo da proposta'], cta: 'Fale com nosso time' },
    ]
  }
}
