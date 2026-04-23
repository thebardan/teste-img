import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PromptEngineService } from '../ai/prompt-engine/prompt-engine.service'
import { BrandGuardianAgent } from '../ai/agents/brand-guardian.agent'
import { VisualSystemAgent } from '../ai/agents/visual-system.agent'
import type { CreatePresentationDto } from './dto/create-presentation.dto'
import { UsersService } from '../users/users.service'

const FALLBACK_TEMPLATE_ID = 'tpl-deck-corporate'

const SLIDE_TYPES = ['cover', 'context', 'products', 'benefits', 'closing'] as const
type SlideType = (typeof SLIDE_TYPES)[number]

@Injectable()
export class PresentationsService {
  constructor(
    private prisma: PrismaClient,
    private promptEngine: PromptEngineService,
    private brandGuardian: BrandGuardianAgent,
    private visualSystemAgent: VisualSystemAgent,
    private users: UsersService,
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

  async generate(dto: CreatePresentationDto, callerEmail?: string | null) {
    const author = await this.users.resolveCaller(callerEmail)

    const templateId = dto.templateId ?? FALLBACK_TEMPLATE_ID
    const template = await this.prisma.template.findUnique({ where: { id: templateId } })
    if (!template) throw new Error(`Template ${templateId} not found`)

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds } },
      include: {
        benefits: { take: 3 },
        specifications: { take: 4 },
        images: { orderBy: { order: 'asc' } },
      },
    })
    if (!products.length) throw new Error('No valid products found')

    const client = dto.clientId
      ? await this.prisma.client.findUnique({ where: { id: dto.clientId } })
      : null

    const allProductImages = products.flatMap((p) => p.images.map((img) => img.url))

    const productsText = products
      .map((p) => `${p.name} (${p.sku}): ${p.benefits.map((b) => b.text).join(', ')}`)
      .join('\n')

    // [1] VisualSystem — single shared system for whole deck (drives palette, background, darkMode)
    const headerProduct = products[0]
    const visualSystem = await this.visualSystemAgent.generate({
      productName: headerProduct.name,
      category: headerProduct.category,
      headline: client?.name ?? 'Apresentação Comercial',
      channel: dto.channel,
    })

    // [2] Structure
    const structureResult = await this.promptEngine.run('slide-structure', {
      clientName: client?.name ?? 'Cliente',
      products: productsText,
      focus: dto.focus ?? 'benefícios e diferenciais',
      channel: dto.channel ?? 'Varejo',
    })

    const rawSlides: any[] =
      (structureResult.parsedOutput as any)?.slides ??
      this.defaultSlides(client?.name, products[0].name)

    // [3] Logo using VisualSystem's darkMode
    const bgKind: 'DARK' | 'LIGHT' = visualSystem.mood.darkMode ? 'DARK' : 'LIGHT'
    const logoSelection = await this.brandGuardian.selectLogo({ background: bgKind })

    // [4] Per-slide copy
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
            logoUrl: logoSelection.logoUrl,
            productImageUrls: allProductImages,
            visualSystem,
            visualDirection: {
              colors: [visualSystem.palette.background, visualSystem.palette.backgroundSecondary, visualSystem.palette.dominant],
              style: visualSystem.mood.style,
              emotionalTone: visualSystem.mood.emotionalTone,
              background: bgKind,
            },
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
        authorId: author.id,
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

  async updateSlideContent(id: string, slideOrder: number, partial: Record<string, any>) {
    const latest = await this.getLatestVersion(id)
    const slide = latest.slides.find((s) => s.order === slideOrder)
    if (!slide) throw new NotFoundException(`Slide ${slideOrder} not found`)
    const current = (slide.content ?? {}) as Record<string, any>
    const merged = { ...current, ...partial }
    await this.prisma.presentationSlide.update({
      where: { id: slide.id },
      data: { content: merged as any },
    })
    return { updated: true, order: slideOrder, content: merged }
  }

  async regenerateSlide(id: string, slideOrder: number) {
    const { presentation, latest } = await this.loadForRegenerate(id)
    const slide = latest.slides.find((s) => s.order === slideOrder)
    if (!slide) throw new NotFoundException(`Slide ${slideOrder} not found`)
    const content = (slide.content ?? {}) as any
    const slideType = content.type ?? 'context'

    const productsText = await this.getProductsText(presentation.id)
    const client = presentation.clientId
      ? await this.prisma.client.findUnique({ where: { id: presentation.clientId } })
      : null

    const copyResult = await this.promptEngine.run('slide-copy', {
      slideType,
      title: content.title ?? '',
      context: `Produto(s): ${productsText}, Cliente: ${client?.name ?? 'Cliente'}`,
    })
    const enriched = (copyResult.parsedOutput as any) ?? {}
    const merged = {
      ...content,
      title: enriched.title ?? content.title,
      subtitle: enriched.subtitle ?? content.subtitle,
      body: enriched.body ?? content.body ?? [],
    }
    await this.prisma.presentationSlide.update({
      where: { id: slide.id },
      data: { content: merged as any },
    })
    return { updated: true, order: slideOrder, content: merged }
  }

  async reorderSlides(id: string, orderedIds: string[]) {
    const latest = await this.getLatestVersion(id)
    const idSet = new Set(latest.slides.map((s) => s.id))
    if (orderedIds.length !== latest.slides.length || orderedIds.some((x) => !idSet.has(x))) {
      throw new BadRequestException('orderedIds must match existing slide IDs exactly')
    }
    await this.prisma.$transaction(
      orderedIds.map((slideId, idx) =>
        this.prisma.presentationSlide.update({
          where: { id: slideId },
          data: { order: idx },
        }),
      ),
    )
    return { reordered: true }
  }

  async addSlide(id: string, slideType: SlideType, afterOrder?: number) {
    const latest = await this.getLatestVersion(id)
    const sortedSlides = [...latest.slides].sort((a, b) => a.order - b.order)
    const insertAt = typeof afterOrder === 'number' ? afterOrder + 1 : sortedSlides.length

    // Shift orders >= insertAt
    const toShift = sortedSlides.filter((s) => s.order >= insertAt)

    const firstSlideContent = (sortedSlides[0]?.content ?? {}) as any
    const vs = firstSlideContent.visualSystem ?? null
    const vd = firstSlideContent.visualDirection ?? null
    const logoUrl = firstSlideContent.logoUrl ?? null
    const logoAssetId = firstSlideContent.logoAssetId ?? null

    const content = {
      type: slideType,
      title: defaultTitleFor(slideType),
      subtitle: null,
      body: [],
      cta: slideType === 'closing' ? 'Fale com nosso time' : null,
      logoUrl,
      logoAssetId,
      visualSystem: vs,
      visualDirection: vd,
    }

    await this.prisma.$transaction([
      ...toShift.map((s) =>
        this.prisma.presentationSlide.update({
          where: { id: s.id },
          data: { order: s.order + 1 },
        }),
      ),
      this.prisma.presentationSlide.create({
        data: {
          versionId: latest.id,
          order: insertAt,
          content: content as any,
        },
      }),
    ])

    return { added: true, order: insertAt }
  }

  async removeSlide(id: string, slideOrder: number) {
    const latest = await this.getLatestVersion(id)
    const slide = latest.slides.find((s) => s.order === slideOrder)
    if (!slide) throw new NotFoundException(`Slide ${slideOrder} not found`)

    const toShift = latest.slides.filter((s) => s.order > slideOrder)
    await this.prisma.$transaction([
      this.prisma.presentationSlide.delete({ where: { id: slide.id } }),
      ...toShift.map((s) =>
        this.prisma.presentationSlide.update({
          where: { id: s.id },
          data: { order: s.order - 1 },
        }),
      ),
    ])

    return { removed: true }
  }

  async remove(id: string) {
    const presentation = await this.prisma.presentation.findUnique({ where: { id } })
    if (!presentation) throw new NotFoundException(`Presentation ${id} not found`)
    await this.prisma.$transaction([
      this.prisma.inferenceLog.deleteMany({ where: { presentationVersion: { presentationId: id } } }),
      this.prisma.exportedArtifact.deleteMany({ where: { presentationVersion: { presentationId: id } } }),
      this.prisma.presentationSlide.deleteMany({ where: { version: { presentationId: id } } }),
      this.prisma.presentationVersion.deleteMany({ where: { presentationId: id } }),
      this.prisma.approval.deleteMany({ where: { presentationId: id } }),
      this.prisma.presentation.delete({ where: { id } }),
    ])
    return { deleted: true }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getLatestVersion(id: string) {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { slides: { orderBy: { order: 'asc' } } },
        },
      },
    })
    if (!presentation) throw new NotFoundException(`Presentation ${id} not found`)
    const latest = presentation.versions[0]
    if (!latest) throw new NotFoundException('No version found')
    return latest
  }

  private async loadForRegenerate(id: string) {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { slides: { orderBy: { order: 'asc' } } },
        },
      },
    })
    if (!presentation) throw new NotFoundException(`Presentation ${id} not found`)
    const latest = presentation.versions[0]
    if (!latest) throw new NotFoundException('No version found')
    return { presentation, latest }
  }

  private async getProductsText(_presentationId: string): Promise<string> {
    // Presentation has no direct productIds link in schema; reuse first slide productImageUrls derivation via client/channel text.
    // For now we lean on the latest slide content for context; fall back to generic text.
    return 'Produtos do catálogo Multilaser'
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

function defaultTitleFor(type: SlideType): string {
  const titles: Record<SlideType, string> = {
    cover: 'Novo Slide — Capa',
    context: 'Contexto',
    products: 'Produtos',
    benefits: 'Benefícios',
    closing: 'Próximos Passos',
  }
  return titles[type]
}
