import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { GeminiArtProvider } from '../../ai/providers/gemini/gemini-art.provider'
import { StorageService } from '../../storage/storage.service'

@Injectable()
export class ArtComposerService {
  private readonly logger = new Logger(ArtComposerService.name)

  constructor(
    private prisma: PrismaClient,
    private artProvider: GeminiArtProvider,
    private storage: StorageService,
  ) {}

  async generateArt(
    salesSheetId: string,
    refinementPrompt?: string,
  ): Promise<{ artImageUrl: string; artImageKey: string }> {
    const salesSheet = await this.prisma.salesSheet.findUnique({
      where: { id: salesSheetId },
      include: {
        product: {
          include: {
            images: { orderBy: { order: 'asc' } },
            benefits: { orderBy: { order: 'asc' } },
            specifications: true,
          },
        },
        template: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    })

    if (!salesSheet) throw new NotFoundException(`Sales sheet ${salesSheetId} not found`)
    const version = salesSheet.versions[0]
    if (!version) throw new NotFoundException('No version found')

    // Load product images as base64 (up to 4)
    const referenceImages: { base64: string; mimeType: string }[] = []
    for (const img of salesSheet.product.images.slice(0, 4)) {
      try {
        const buffer = await this.storage.getBuffer(img.url)
        referenceImages.push({ base64: buffer.toString('base64'), mimeType: 'image/png' })
      } catch {
        this.logger.warn(`Could not load product image: ${img.url}`)
      }
    }

    const content = version.content as any
    const prompt = this.buildPrompt(
      salesSheet.product.name,
      content,
      salesSheet.template?.zonesConfig as any,
      salesSheet.product.benefits.map((b) => b.text),
      refinementPrompt,
    )

    const result = await this.artProvider.generate(prompt, referenceImages)

    const imageBuffer = Buffer.from(result.imageBase64, 'base64')
    const ext = result.mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const storageKey = `art/sales-sheets/${salesSheetId}/v${version.versionNumber}-${Date.now()}.${ext}`
    await this.storage.upload(storageKey, imageBuffer, result.mimeType, 'image')

    await this.prisma.salesSheetVersion.update({
      where: { id: version.id },
      data: { artImageKey: storageKey, artGeneratedAt: new Date() },
    })

    const artImageUrl = await this.storage.getPresignedUrl(storageKey)
    return { artImageUrl, artImageKey: storageKey }
  }

  private buildPrompt(
    productName: string,
    content: any,
    zonesConfig: any,
    benefits: string[],
    refinementPrompt?: string,
  ): string {
    const headline = content?.headline ?? ''
    const subtitle = content?.subtitle ?? ''
    const benefitsList = (content?.benefits ?? benefits).join(', ')

    let prompt = `Crie uma lâmina de vendas profissional para o produto "${productName}".

CONTEÚDO:
- Headline: ${headline}
- Subtítulo: ${subtitle}
- Benefícios: ${benefitsList}

DIRETRIZES DE DESIGN:
- Layout limpo e moderno, estilo corporativo
- Use as imagens do produto fornecidas como elemento central
- Fundo escuro (#111827) com elementos em branco e amarelo (#F59E0B) como cor de destaque
- Tipografia clara e hierárquica
- Inclua o headline em destaque, os benefícios listados, e a imagem do produto em evidência
- Formato: A4 retrato (595 × 842 pt)
- A arte deve estar pronta para impressão e uso comercial`

    if (refinementPrompt) {
      prompt += `\n\nAJUSTES SOLICITADOS:\n${refinementPrompt}`
    }

    return prompt
  }
}
