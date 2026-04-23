import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { CopyDirectorAgent } from '../ai/agents/copy-director.agent'
import { VisualSystemAgent } from '../ai/agents/visual-system.agent'
import { BrandGuardianAgent } from '../ai/agents/brand-guardian.agent'
import { SalesCopywriterAgent } from '../ai/agents/sales-copywriter.agent'
import { LayoutEngine } from '../ai/layout/layout-engine'
import { DesignQA } from '../ai/qa/design-qa.service'
import type { CreateSalesSheetDto } from './dto/create-sales-sheet.dto'
import { UsersService } from '../users/users.service'

const FALLBACK_TEMPLATE_ID = 'tpl-sales-sheet-horizontal'

@Injectable()
export class SalesSheetsService {
  constructor(
    private prisma: PrismaClient,
    private copyDirector: CopyDirectorAgent,
    private visualSystemAgent: VisualSystemAgent,
    private brandGuardianAgent: BrandGuardianAgent,
    private copywriterAgent: SalesCopywriterAgent,
    private users: UsersService,
  ) {}

  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    const [sheets, total] = await Promise.all([
      this.prisma.salesSheet.findMany({
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          template: { select: { name: true } },
          author: { select: { name: true } },
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      }),
      this.prisma.salesSheet.count(),
    ])
    return { data: sheets, total, page, pageSize }
  }

  async findOne(id: string) {
    const sheet = await this.prisma.salesSheet.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            images: { orderBy: { order: 'asc' } },
            benefits: { orderBy: { order: 'asc' } },
            specifications: true,
          },
        },
        template: true,
        author: { select: { id: true, name: true, email: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { artifacts: true, inferenceLogs: { take: 5, orderBy: { createdAt: 'desc' } } },
        },
        approvals: { include: { approver: { select: { name: true } } } },
      },
    })
    if (!sheet) throw new NotFoundException(`SalesSheet ${id} not found`)
    return sheet
  }

  async generate(dto: CreateSalesSheetDto, callerEmail?: string | null) {
    // 1. Load product with all data
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        benefits: { orderBy: { order: 'asc' } },
        specifications: true,
        images: { orderBy: { order: 'asc' } },
      },
    })
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`)

    const author = await this.users.resolveCaller(callerEmail)

    const templateId = dto.templateId ?? FALLBACK_TEMPLATE_ID
    const template = await this.prisma.template.findUnique({ where: { id: templateId } })
    if (!template) throw new Error(`Template ${templateId} not found`)

    const channel = dto.channel ?? 'Varejo'
    const specsText = product.specifications
      .slice(0, 5)
      .map((s) => `${s.key}: ${s.value}${s.unit ? ' ' + s.unit : ''}`)
      .join(', ')
    const allImageUrls = product.images.map((img) => img.url)

    // ═══ DESIGNER ENGINE PIPELINE ═══

    // [1] Copy Director → 3 copy variations
    const copyResult = await this.copyDirector.generate({
      productName: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      benefits: product.benefits.map((b) => b.text),
      specs: specsText,
      channel,
    })

    // [2] Visual System Generator → 3 distinct systems, one per copy variation
    const visualSystems = await Promise.all(
      copyResult.variations.map((copy) =>
        this.visualSystemAgent.generate({
          productName: product.name,
          category: product.category,
          headline: copy.headline,
          emotionalTone: copyResult.toneProfile.voice,
          channel,
        }),
      ),
    )
    const visualSystem = visualSystems[0]

    // [3] Layout Engine → 3 layout compositions
    const templateName = template.name?.toLowerCase() ?? ''
    const orientation = templateName.includes('vertical') || templateName.includes('a4') ? 'portrait' as const : 'landscape' as const
    const layouts = LayoutEngine.compute({
      headline: copyResult.variations[0].headline,
      benefits: copyResult.variations[0].benefits,
      cta: copyResult.variations[0].cta,
      hasImage: allImageUrls.length > 0,
      hasLogo: true,
      hasQr: true,
      hasSpecs: product.specifications.length > 0,
      orientation,
    })

    // [4] Select logo (uses best variation's system)
    const bgType = visualSystem.mood.darkMode ? 'DARK' as const : 'LIGHT' as const
    const logoSelection = await this.brandGuardianAgent.selectLogo({ background: bgType })

    // [5] Design QA → score each combination
    const variations = copyResult.variations.map((copy, i) => {
      const layout = layouts[i % layouts.length]
      const vs = visualSystems[i] ?? visualSystem

      const qaResult = DesignQA.evaluate({
        palette: {
          text: vs.palette.text,
          textSecondary: typeof vs.palette.textSecondary === 'string' ? vs.palette.textSecondary : '#999999',
          background: vs.palette.background,
          dominant: vs.palette.dominant,
          accent: vs.palette.accent,
        },
        typography: { scale: vs.typography.scale },
        zones: layout.zones,
        hasLogo: true,
        minFontSize: 8,
      })

      return {
        copy: {
          approach: copy.approach,
          headline: copy.headline,
          subtitle: copy.subtitle,
          benefits: copy.benefits,
          cta: copy.cta,
        },
        visualSystem: vs,
        layout: {
          composition: layout.composition,
          zones: layout.zones,
          margins: layout.margins,
          contentAdaptations: layout.contentAdaptations,
        },
        qaScore: qaResult.score,
      }
    })

    // Sort by QA score descending, take best 3
    variations.sort((a, b) => b.qaScore - a.qaScore)
    const bestVariations = variations.slice(0, 3)

    // Store all alternate layouts so editor can swap without regeneration
    const layoutAlternatives = layouts.map((l) => ({
      composition: l.composition,
      zones: l.zones,
      margins: l.margins,
      contentAdaptations: l.contentAdaptations,
    }))

    // [6] Build content
    const content = {
      // Active copy (from best variation)
      headline: bestVariations[0].copy.headline,
      subtitle: bestVariations[0].copy.subtitle,
      benefits: bestVariations[0].copy.benefits,
      cta: bestVariations[0].copy.cta,
      // Images
      productImageUrl: allImageUrls[0] ?? '',
      productImageUrls: allImageUrls,
      // Brand
      logoAssetId: logoSelection.logoAssetId,
      logoUrl: logoSelection.logoUrl,
      qrUrl: dto.qrUrl ?? product.qrDestination ?? 'https://multilaser.com.br',
      // Visual system
      visualDirection: {
        style: visualSystem.mood.style,
        colors: [visualSystem.palette.background, visualSystem.palette.backgroundSecondary, visualSystem.palette.dominant],
        imageAmbiance: visualSystem.mood.emotionalTone,
        emotionalTone: visualSystem.mood.emotionalTone,
        background: bgType,
      },
      visualSystem,
      // Layout
      layout: { templateId, zones: bestVariations[0].layout.zones },
      layoutAlternatives,
      selectedLayoutIndex: 0,
      // Designer Engine: variations for user choice
      variations: bestVariations,
      selectedVariation: 0,
      // Tone profile
      toneProfile: copyResult.toneProfile,
    }

    // [7] Persist
    const salesSheet = await this.prisma.salesSheet.create({
      data: {
        title: `${product.name} — Lâmina`,
        status: 'DRAFT',
        productId: product.id,
        templateId,
        authorId: author.id,
        versions: {
          create: {
            versionNumber: 1,
            content: content as any,
          },
        },
      },
      include: {
        versions: true,
        product: { select: { name: true, sku: true } },
        template: { select: { name: true } },
      },
    })

    return {
      salesSheet,
      content,
      copyResult,
      visualSystem,
      logoSelection,
    }
  }

  async updateStatus(id: string, status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED') {
    return this.prisma.salesSheet.update({ where: { id }, data: { status } })
  }

  async updateContent(id: string, partialContent: Record<string, any>) {
    const sheet = await this.prisma.salesSheet.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    })
    if (!sheet) throw new NotFoundException(`SalesSheet ${id} not found`)
    const version = sheet.versions[0]
    if (!version) throw new NotFoundException('No version found')

    const current = (version.content ?? {}) as Record<string, any>
    const merged = { ...current, ...partialContent }

    await this.prisma.salesSheetVersion.update({
      where: { id: version.id },
      data: { content: merged as any },
    })

    return { updated: true, content: merged }
  }

  async regenerateField(id: string, field: string, guidance?: string) {
    const sheet = await this.prisma.salesSheet.findUnique({
      where: { id },
      include: {
        product: { include: { benefits: { orderBy: { order: 'asc' } }, specifications: true } },
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    })
    if (!sheet) throw new NotFoundException(`SalesSheet ${id} not found`)
    const product = sheet.product
    const version = sheet.versions[0]
    if (!version) throw new NotFoundException('No version found')

    const current = (version.content ?? {}) as Record<string, any>

    const specsText = product.specifications
      .slice(0, 5)
      .map((s) => `${s.key}: ${s.value}${s.unit ? ' ' + s.unit : ''}`)
      .join(', ')

    const effectiveDescription = guidance
      ? `${product.description}\n\nOrientação do editor: ${guidance}`
      : product.description

    const copy = await this.copywriterAgent.generate({
      productName: product.name,
      sku: product.sku,
      category: product.category,
      description: effectiveDescription,
      benefits: product.benefits.map((b) => b.text),
      specs: specsText,
      channel: (current?.toneProfile?.channel as string) ?? 'Varejo',
    })

    const fieldMap: Record<string, any> = {
      headline: copy.headline,
      subtitle: copy.subtitle,
      benefits: copy.benefits,
      cta: copy.cta,
    }

    if (!(field in fieldMap)) {
      return { error: `Field ${field} cannot be regenerated` }
    }

    const merged = { ...current, [field]: fieldMap[field] }
    await this.prisma.salesSheetVersion.update({
      where: { id: version.id },
      data: { content: merged as any },
    })

    return { updated: true, field, value: fieldMap[field], content: merged }
  }

  async generateMoreVariations(id: string, guidance?: string) {
    const sheet = await this.prisma.salesSheet.findUnique({
      where: { id },
      include: {
        product: { include: { benefits: { orderBy: { order: 'asc' } }, specifications: true } },
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    })
    if (!sheet) throw new NotFoundException(`SalesSheet ${id} not found`)
    const product = sheet.product
    const version = sheet.versions[0]
    if (!version) throw new NotFoundException('No version found')

    const current = (version.content ?? {}) as Record<string, any>
    const specsText = product.specifications
      .slice(0, 5)
      .map((s) => `${s.key}: ${s.value}${s.unit ? ' ' + s.unit : ''}`)
      .join(', ')

    const channel = (current?.toneProfile?.channel as string) ?? 'Varejo'
    const copyResult = await this.copyDirector.generate({
      productName: product.name,
      sku: product.sku,
      category: product.category,
      description: guidance
        ? `${product.description}\n\nOrientação do editor: ${guidance}`
        : product.description,
      benefits: product.benefits.map((b) => b.text),
      specs: specsText,
      channel,
    })

    const newVariations = copyResult.variations.map((copy) => ({
      copy: {
        approach: copy.approach,
        headline: copy.headline,
        subtitle: copy.subtitle,
        benefits: copy.benefits,
        cta: copy.cta,
      },
      visualSystem: current.visualSystem ?? null,
      layout: current.layout ?? null,
      qaScore: 0,
    }))

    const existing: any[] = Array.isArray(current.variations) ? current.variations : []
    const merged = {
      ...current,
      variations: [...existing, ...newVariations],
    }
    await this.prisma.salesSheetVersion.update({
      where: { id: version.id },
      data: { content: merged as any },
    })
    return { updated: true, addedCount: newVariations.length, content: merged }
  }

  async remove(id: string) {
    const sheet = await this.prisma.salesSheet.findUnique({ where: { id } })
    if (!sheet) throw new NotFoundException(`SalesSheet ${id} not found`)
    await this.prisma.$transaction([
      this.prisma.inferenceLog.deleteMany({ where: { salesSheetVersion: { salesSheetId: id } } }),
      this.prisma.exportedArtifact.deleteMany({ where: { salesSheetVersion: { salesSheetId: id } } }),
      this.prisma.salesSheetVersion.deleteMany({ where: { salesSheetId: id } }),
      this.prisma.approval.deleteMany({ where: { salesSheetId: id } }),
      this.prisma.salesSheet.delete({ where: { id } }),
    ])
    return { deleted: true }
  }
}
