import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { QAAgent } from '../ai/agents/qa.agent'
import { ImageQAService } from '../ai/qa/image-qa.service'

@Injectable()
export class QAService {
  constructor(
    private prisma: PrismaClient,
    private qaAgent: QAAgent,
    private imageQA: ImageQAService,
  ) {}

  async checkSalesSheetArt(id: string) {
    const sheet = await this.prisma.salesSheet.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, category: true } },
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    })
    if (!sheet) throw new NotFoundException(`SalesSheet ${id} not found`)
    const version = sheet.versions[0]
    if (!version?.artImageKey) throw new NotFoundException('No art generated yet')
    const content = (version.content ?? {}) as any
    return this.imageQA.evaluate(version.artImageKey, {
      productName: sheet.product.name,
      category: sheet.product.category,
      headline: content.headline,
      expectedColors: content.visualDirection?.colors,
      hasLogo: !!content.logoUrl,
    })
  }

  async checkSalesSheet(id: string) {
    const sheet = await this.prisma.salesSheet.findUnique({
      where: { id },
      include: {
        product: { select: { name: true } },
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    })
    if (!sheet) throw new NotFoundException(`SalesSheet ${id} not found`)

    const version = sheet.versions[0]
    if (!version) throw new NotFoundException('No version found for this sales sheet')

    const content = version.content as Record<string, any>
    return this.qaAgent.checkSalesSheet(content, sheet.product.name)
  }

  async checkPresentation(id: string) {
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

    const version = presentation.versions[0]
    if (!version) throw new NotFoundException('No version found for this presentation')

    const slides = version.slides.map((s) => ({ order: s.order, content: s.content as Record<string, any> }))
    return this.qaAgent.checkPresentation(slides, presentation.title)
  }
}
