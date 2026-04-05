import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClient, ArtifactType } from '@prisma/client'
import { StorageService } from '../storage/storage.service'
import { PptxComposerService } from './services/pptx-composer.service'
import { PdfComposerService } from './services/pdf-composer.service'

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

@Injectable()
export class ExportsService {
  constructor(
    private prisma: PrismaClient,
    private storage: StorageService,
    private pptxComposer: PptxComposerService,
    private pdfComposer: PdfComposerService,
  ) {}

  // ─── Presentation ───────────────────────────────────────────────────────────

  async exportPresentationPptx(presentationId: string) {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { slides: { orderBy: { order: 'asc' } } },
        },
      },
    })
    if (!presentation) throw new NotFoundException(`Presentation ${presentationId} not found`)

    const version = presentation.versions[0]
    if (!version) throw new NotFoundException('No version found for this presentation')

    const slides = version.slides.map((s) => ({ order: s.order, content: s.content as any }))
    const buffer = await this.pptxComposer.compose(presentation.title, slides)

    const filename = `${slugify(presentation.title)}-v${version.versionNumber}.pptx`
    const storageKey = `exports/presentations/${presentationId}/${filename}`

    await this.storage.upload(storageKey, buffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')

    const artifact = await this.prisma.exportedArtifact.create({
      data: {
        type: ArtifactType.PPTX,
        storageKey,
        filename,
        sizeBytes: buffer.length,
        presentationVersionId: version.id,
      },
    })

    const downloadUrl = await this.storage.getPresignedUrl(storageKey, 3600)
    return { artifact, downloadUrl }
  }

  async exportPresentationPdf(presentationId: string) {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { slides: { orderBy: { order: 'asc' } } },
        },
      },
    })
    if (!presentation) throw new NotFoundException(`Presentation ${presentationId} not found`)

    const version = presentation.versions[0]
    if (!version) throw new NotFoundException('No version found for this presentation')

    const slides = version.slides.map((s) => ({ order: s.order, content: s.content as any }))
    const buffer = await this.pdfComposer.composePresentation(presentation.title, slides)

    const filename = `${slugify(presentation.title)}-v${version.versionNumber}.pdf`
    const storageKey = `exports/presentations/${presentationId}/${filename}`

    await this.storage.upload(storageKey, buffer, 'application/pdf')

    const artifact = await this.prisma.exportedArtifact.create({
      data: {
        type: ArtifactType.PDF,
        storageKey,
        filename,
        sizeBytes: buffer.length,
        presentationVersionId: version.id,
      },
    })

    const downloadUrl = await this.storage.getPresignedUrl(storageKey, 3600)
    return { artifact, downloadUrl }
  }

  // ─── Sales Sheet ────────────────────────────────────────────────────────────

  async exportSalesSheetPdf(salesSheetId: string) {
    const sheet = await this.prisma.salesSheet.findUnique({
      where: { id: salesSheetId },
      include: {
        product: { select: { name: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    })
    if (!sheet) throw new NotFoundException(`SalesSheet ${salesSheetId} not found`)

    const version = sheet.versions[0]
    if (!version) throw new NotFoundException('No version found for this sales sheet')

    const content = version.content as any
    const buffer = await this.pdfComposer.composeSalesSheet(content, sheet.product.name)

    const filename = `${slugify(sheet.title)}-v${version.versionNumber}.pdf`
    const storageKey = `exports/sales-sheets/${salesSheetId}/${filename}`

    await this.storage.upload(storageKey, buffer, 'application/pdf')

    const artifact = await this.prisma.exportedArtifact.create({
      data: {
        type: ArtifactType.PDF,
        storageKey,
        filename,
        sizeBytes: buffer.length,
        salesSheetVersionId: version.id,
      },
    })

    const downloadUrl = await this.storage.getPresignedUrl(storageKey, 3600)
    return { artifact, downloadUrl }
  }

  // ─── Download ───────────────────────────────────────────────────────────────

  async getDownloadUrl(artifactId: string): Promise<{ downloadUrl: string; filename: string }> {
    const artifact = await this.prisma.exportedArtifact.findUnique({ where: { id: artifactId } })
    if (!artifact) throw new NotFoundException(`Artifact ${artifactId} not found`)
    const downloadUrl = await this.storage.getPresignedUrl(artifact.storageKey, 3600)
    return { downloadUrl, filename: artifact.filename }
  }

  async listArtifactsForPresentation(presentationId: string) {
    const versions = await this.prisma.presentationVersion.findMany({
      where: { presentationId },
      select: { id: true },
    })
    const ids = versions.map((v) => v.id)
    return this.prisma.exportedArtifact.findMany({
      where: { presentationVersionId: { in: ids } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async listArtifactsForSalesSheet(salesSheetId: string) {
    const versions = await this.prisma.salesSheetVersion.findMany({
      where: { salesSheetId },
      select: { id: true },
    })
    const ids = versions.map((v) => v.id)
    return this.prisma.exportedArtifact.findMany({
      where: { salesSheetVersionId: { in: ids } },
      orderBy: { createdAt: 'desc' },
    })
  }
}
