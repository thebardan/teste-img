import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { SalesCopywriterAgent } from '../ai/agents/sales-copywriter.agent'
import { BrandGuardianAgent } from '../ai/agents/brand-guardian.agent'
import { VisualDirectorAgent } from '../ai/agents/visual-director.agent'
import type { CreateSalesSheetDto } from './dto/create-sales-sheet.dto'

// Fallback system user and template for when no auth exists
const SYSTEM_USER_EMAIL = 'admin@multilaser.com.br'
const FALLBACK_TEMPLATE_ID = 'tpl-sales-sheet-horizontal'

@Injectable()
export class SalesSheetsService {
  constructor(
    private prisma: PrismaClient,
    private copywriterAgent: SalesCopywriterAgent,
    private brandGuardianAgent: BrandGuardianAgent,
    private visualDirectorAgent: VisualDirectorAgent,
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

  async generate(dto: CreateSalesSheetDto) {
    // 1. Load product
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        benefits: { orderBy: { order: 'asc' } },
        specifications: true,
        images: { orderBy: { order: 'asc' }, take: 1 },
      },
    })
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`)

    // 2. Ensure system user + template exist
    const systemUser = await this.prisma.user.findFirst({ where: { email: SYSTEM_USER_EMAIL } })
    if (!systemUser) throw new Error('System user not found — run seed first')

    const templateId = dto.templateId ?? FALLBACK_TEMPLATE_ID
    const template = await this.prisma.template.findUnique({ where: { id: templateId } })
    if (!template) throw new Error(`Template ${templateId} not found`)

    // 3. Generate copy via AI
    const specsText = product.specifications
      .slice(0, 5)
      .map((s) => `${s.key}: ${s.value}${s.unit ? ' ' + s.unit : ''}`)
      .join(', ')

    const copy = await this.copywriterAgent.generate({
      productName: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      benefits: product.benefits.map((b) => b.text),
      specs: specsText,
      channel: dto.channel ?? 'Varejo',
    })

    // 4. Visual direction
    const visual = await this.visualDirectorAgent.direct({
      productName: product.name,
      category: product.category,
      headline: copy.headline,
    })

    // 5. Select logo
    const logoSelection = await this.brandGuardianAgent.selectLogo({
      background: visual.suggestedBackground,
    })

    // 6. Build SalesSheetContent
    const content = {
      headline: copy.headline,
      subtitle: copy.subtitle,
      benefits: copy.benefits,
      cta: copy.cta,
      productImageUrl: product.images[0]?.url ?? '',
      logoAssetId: logoSelection.logoAssetId,
      qrUrl: dto.qrUrl ?? product.qrDestination ?? 'https://multilaser.com.br',
      layout: { templateId, zones: template.zonesConfig },
      visualDirection: {
        style: visual.style,
        colors: visual.colors,
        imageAmbiance: visual.imageAmbiance,
        emotionalTone: visual.emotionalTone,
        background: visual.suggestedBackground,
      },
      logoUrl: logoSelection.logoUrl,
    }

    // 7. Persist SalesSheet + Version
    const salesSheet = await this.prisma.salesSheet.create({
      data: {
        title: `${product.name} — Lâmina`,
        status: 'DRAFT',
        productId: product.id,
        templateId,
        authorId: systemUser.id,
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
      copy,
      visual,
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

  async regenerateField(id: string, field: string) {
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

    const copy = await this.copywriterAgent.generate({
      productName: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      benefits: product.benefits.map((b) => b.text),
      specs: specsText,
      channel: 'Varejo',
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

  async remove(id: string) {
    const sheet = await this.prisma.salesSheet.findUnique({ where: { id } })
    if (!sheet) throw new NotFoundException(`SalesSheet ${id} not found`)
    // Cascade: delete versions, approvals, artifacts, inference logs
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
