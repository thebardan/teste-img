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

  async generateBatch(
    salesSheetId: string,
    count: number,
    refinementPrompt?: string,
  ): Promise<{ artImageUrl: string; artImageKey: string }[]> {
    const n = Math.max(1, Math.min(5, count))
    const results = await Promise.all(
      Array.from({ length: n }).map((_, i) => {
        const variantHint = `\n\nVariação ${i + 1}/${n}: explore composição/angulação diferente das anteriores.`
        return this.generateArt(salesSheetId, (refinementPrompt ?? '') + variantHint)
      }),
    )
    return results
  }

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
        const key = this.storage.extractKey(img.url)
        const buffer = await this.storage.getBuffer(key)
        const mime = img.url.match(/\.(png|webp|gif)$/i) ? 'image/png' : 'image/jpeg'
        referenceImages.push({ base64: buffer.toString('base64'), mimeType: mime })
      } catch (err) {
        this.logger.warn(`Could not load product image (key=${img.url}): ${err}`)
      }
    }
    this.logger.log(`Loaded ${referenceImages.length}/${salesSheet.product.images.slice(0, 4).length} reference images`)

    // Load logo as base64 if available
    const content = version.content as any
    const logoUrl = content?.logoUrl
    let logoImage: { base64: string; mimeType: string } | null = null
    if (logoUrl) {
      try {
        const logoKey = this.storage.extractKey(logoUrl)
        const logoBuf = await this.storage.getBuffer(logoKey)
        logoImage = { base64: logoBuf.toString('base64'), mimeType: 'image/svg+xml' }
        this.logger.log(`Loaded logo: ${logoKey}`)
      } catch {
        this.logger.warn(`Could not load logo: ${logoUrl}`)
      }
    }

    const templateType = salesSheet.template?.type ?? 'SALES_SHEET_HORIZONTAL'
    const prompt = this.buildPrompt({
      productName: salesSheet.product.name,
      category: salesSheet.product.category,
      description: salesSheet.product.description,
      specifications: salesSheet.product.specifications,
      content,
      benefits: salesSheet.product.benefits.map((b) => b.text),
      hasReferenceImages: referenceImages.length > 0,
      templateType,
      zonesConfig: salesSheet.template?.zonesConfig as any,
      hasLogo: !!logoImage,
      refinementPrompt,
    })

    // Append logo to reference images if loaded
    if (logoImage) referenceImages.push(logoImage)

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

  private buildPrompt(input: {
    productName: string
    category: string
    description: string
    specifications: { key: string; value: string; unit: string | null }[]
    content: any
    benefits: string[]
    hasReferenceImages: boolean
    templateType: string
    zonesConfig: any
    hasLogo: boolean
    refinementPrompt?: string
  }): string {
    const { productName, category, description, specifications, content, benefits, hasReferenceImages, templateType, zonesConfig, hasLogo, refinementPrompt } = input
    const headline = content?.headline ?? ''
    const subtitle = content?.subtitle ?? ''
    const benefitsList = (content?.benefits ?? benefits).join(' | ')
    const cta = content?.cta ?? ''

    const visualDir = content?.visualDirection
    const style = visualDir?.style ?? 'clean tech'
    const ambiance = visualDir?.imageAmbiance ?? ''
    const emotionalTone = visualDir?.emotionalTone ?? 'moderno e confiante'
    const colors = visualDir?.colors ?? ['#111827', '#F59E0B']

    const specsText = specifications.slice(0, 6)
      .map((s) => `${s.key}: ${s.value}${s.unit ? ` ${s.unit}` : ''}`)
      .join(', ')

    const scene = this.suggestScene(category, productName)

    // Determine orientation and dimensions from template type
    const isHorizontal = templateType.includes('HORIZONTAL')
    const orientation = isHorizontal ? 'paisagem (landscape)' : 'retrato (portrait)'
    const aspectRatio = isHorizontal ? '4:3 (1120 × 840 px)' : '3:4 (840 × 1120 px)'

    // Build layout instructions from zonesConfig
    const layoutInstructions = this.buildLayoutInstructions(zonesConfig, isHorizontal)

    let prompt = `Você é um diretor de arte e fotógrafo publicitário de elite criando uma lâmina de vendas premium completa e final.

═══ PRODUTO ═══
Nome: ${productName}
Categoria: ${category}
Descrição: ${description}
Specs: ${specsText || 'N/A'}

═══ MISSÃO ═══
Crie uma LÂMINA DE VENDAS COMPLETA E FINALIZADA, pronta para impressão.
A lâmina combina uma fotografia publicitária do produto em cenário de uso real com textos e elementos gráficos sobrepostos.
${hasReferenceImages ? 'As fotos de referência anexadas mostram o produto EXATO — reproduza-o fielmente na composição.' : 'Represente o produto realisticamente com base na descrição.'}
${hasLogo ? 'A última imagem de referência é o LOGO da marca — inclua-o na composição conforme indicado no layout.' : ''}

═══ FORMATO E ORIENTAÇÃO ═══
- Orientação: ${orientation}
- Proporção: ${aspectRatio}
- IMPORTANTE: a imagem DEVE ser gerada em formato ${orientation}. ${isHorizontal ? 'Largura MAIOR que altura.' : 'Altura MAIOR que largura.'}

═══ LAYOUT DA LÂMINA ═══
${layoutInstructions}

═══ FOTOGRAFIA DO PRODUTO (zona da imagem) ═══
${scene}

Direção fotográfica:
- Produto em cenário de uso real, humanizado e aspiracional
- Profundidade de campo cinematográfica (bokeh f/2.8)
- Escala humana: mãos, objetos de referência, contexto de uso
- Interação natural — nunca posada ou forçada
- Materialidade fiel: texturas reais do produto (plástico, metal, borracha, etc.)
- Iluminação: key light lateral suave (45°), fill sutil, rim light para separar do fundo

═══ DIREÇÃO DE ARTE ═══
- Estilo: ${style}
- Tom emocional: ${emotionalTone}
- Ambiência: ${ambiance}
- Paleta: ${colors.join(', ')}
- As cores da paleta devem permear naturalmente o ambiente, iluminação e elementos gráficos

═══ TEXTOS (renderizar na imagem) ═══
- Headline: "${headline}"
${subtitle ? `- Subtítulo: "${subtitle}"` : ''}
- Benefícios: ${benefitsList}
${cta ? `- CTA (call-to-action): "${cta}"` : ''}

Tipografia OBRIGATÓRIA:
- Fonte: Inter (sans-serif geométrica, limpa)
- Headline: Inter Bold, tamanho grande e impactante
- Subtítulo: Inter Regular, tamanho médio
- Benefícios: Inter Medium, tamanho menor, com bullet points ou ícones minimalistas
- CTA: Inter SemiBold em botão ou badge com cor de destaque
- Todo texto deve ter alto contraste e legibilidade — usar overlay de gradiente sutil se necessário
- NÃO sobrepor texto sobre o produto

═══ QUALIDADE ═══
- Nível: fotografia editorial de revista / Apple product page
- Pronto para impressão comercial
- Sem marcas d'água, sem bordas, sem mockup frames
- A peça deve parecer criada por uma agência de design premium`

    if (refinementPrompt) {
      prompt += `\n\n═══ AJUSTES DO USUÁRIO ═══\n${refinementPrompt}`
    }

    return prompt
  }

  private buildLayoutInstructions(zonesConfig: any, isHorizontal: boolean): string {
    if (!zonesConfig) {
      return isHorizontal
        ? `Layout horizontal padrão:
- ESQUERDA: fotografia do produto em cenário de uso (área principal)
- DIREITA: espaço reservado para headline no topo, benefícios no meio, logo e QR code no canto inferior direito`
        : `Layout vertical padrão:
- TOPO: fotografia do produto em cenário de uso (área principal)
- INFERIOR: espaço reservado para headline, benefícios, CTA, logo e QR code no rodapé`
    }

    // Describe zones using natural spatial terms instead of raw percentages
    // to prevent Gemini from rendering percentage markers on the image
    const zones: string[] = []
    if (zonesConfig.imageZone) {
      const pos = this.describeZonePosition(zonesConfig.imageZone)
      zones.push(`- ZONA DA IMAGEM: ${pos} — foto do produto aqui`)
    }
    if (zonesConfig.headlineZone) {
      const pos = this.describeZonePosition(zonesConfig.headlineZone)
      zones.push(`- ZONA DO HEADLINE: ${pos} — texto principal`)
    }
    if (zonesConfig.benefitsZone) {
      const pos = this.describeZonePosition(zonesConfig.benefitsZone)
      zones.push(`- ZONA DE BENEFÍCIOS: ${pos} — lista de benefícios`)
    }
    if (zonesConfig.logoZone) {
      const pos = this.describeZonePosition(zonesConfig.logoZone)
      zones.push(`- ZONA DO LOGO: ${pos} — logo Multilaser`)
    }
    if (zonesConfig.qrZone) {
      const pos = this.describeZonePosition(zonesConfig.qrZone)
      zones.push(`- ZONA DO QR CODE: ${pos} — QR code`)
    }
    if (zonesConfig.ctaZone) {
      const pos = this.describeZonePosition(zonesConfig.ctaZone)
      zones.push(`- ZONA DO CTA: ${pos} — call-to-action`)
    }

    return `Distribuição de zonas no canvas:
${zones.join('\n')}
Respeite essas posições ao compor a imagem — o produto vai na zona da imagem, textos nas suas respectivas zonas.
IMPORTANTE: NÃO renderize coordenadas, porcentagens, marcações ou guias visuais na imagem. A imagem deve ser limpa e pronta para uso comercial.`
  }

  /** Convert raw zone coordinates into natural spatial descriptions */
  private describeZonePosition(zone: { x: string | number; y: string | number; width: string | number; height: string | number }): string {
    const x = this.pctVal(zone.x)
    const y = this.pctVal(zone.y)
    const w = this.pctVal(zone.width)
    const h = this.pctVal(zone.height)

    const horizontal = x < 20 ? 'lado esquerdo' : x > 60 ? 'lado direito' : 'centro'
    const vertical = y < 20 ? 'parte superior' : y > 60 ? 'parte inferior' : 'centro vertical'
    const size = w > 50 && h > 50 ? 'área grande' : w > 30 || h > 30 ? 'área média' : 'área pequena'

    return `${horizontal}, ${vertical} (${size})`
  }

  private pctVal(val: string | number): number {
    if (typeof val === 'number') return val
    return parseFloat(val) || 0
  }

  private suggestScene(category: string, productName: string): string {
    const cat = category.toLowerCase()
    const name = productName.toLowerCase()

    if (cat.includes('periféric') || cat.includes('mouse') || cat.includes('teclado') || name.includes('mouse') || name.includes('teclado') || name.includes('keyboard')) {
      return `Cenário: setup de mesa de trabalho/gaming moderno e organizado.
Ambiente: desk setup com iluminação ambiente LED suave, monitor parcialmente visível ao fundo desfocado.
Interação: mão posicionada naturalmente sobre o produto, sugerindo uso ativo.
Superfície: desk pad ou mesa de madeira escura/preta.`
    }

    if (cat.includes('áudio') || cat.includes('fone') || cat.includes('headphone') || cat.includes('caixa de som') || name.includes('headphone') || name.includes('earphone') || name.includes('fone') || name.includes('speaker')) {
      return `Cenário: lifestyle urbano ou ambiente aconchegante de sala.
Ambiente: pessoa jovem em contexto casual — café, sofá, transporte, caminhada urbana.
Interação: produto em uso (fone na cabeça / earbuds no ouvido / speaker na estante).
Atmosfera: luzes quentes, texturas de tecido e madeira ao fundo.`
    }

    if (cat.includes('câmera') || cat.includes('segurança') || cat.includes('smart home') || name.includes('câmera') || name.includes('camera')) {
      return `Cenário: ambiente residencial moderno e acolhedor.
Ambiente: sala, corredor ou área externa de casa com boa iluminação.
Interação: produto instalado ou sendo configurado, smartphone mostrando o app ao lado.
Atmosfera: casa segura e tecnológica, sensação de proteção e modernidade.`
    }

    if (cat.includes('fitness') || cat.includes('esporte') || cat.includes('sport') || name.includes('smartwatch') || name.includes('relógio') || name.includes('balança')) {
      return `Cenário: ambiente fitness ou outdoor ativo.
Ambiente: academia, parque, trilha ou sala com tapete de yoga.
Interação: pessoa ativa usando o produto durante exercício.
Atmosfera: energia, saúde, movimento — luz natural dourada.`
    }

    if (cat.includes('cozinha') || cat.includes('eletrodoméstico') || cat.includes('eletroportát') || name.includes('air fryer') || name.includes('cafeteira') || name.includes('liquidificador') || name.includes('mixer')) {
      return `Cenário: bancada de cozinha moderna e bem iluminada.
Ambiente: cozinha com bancada de mármore ou granito, ingredientes frescos ao redor.
Interação: produto em uso — preparando alimento, com vapor ou ingredientes sugerindo ação.
Atmosfera: gourmet caseiro, praticidade, vida saudável.`
    }

    if (cat.includes('notebook') || cat.includes('tablet') || cat.includes('computador') || name.includes('notebook') || name.includes('tablet') || name.includes('laptop')) {
      return `Cenário: ambiente de trabalho criativo ou home office premium.
Ambiente: mesa clean com planta, xícara de café, iluminação natural de janela.
Interação: tela ligada com conteúdo sugerido, mãos digitando ou touchpad.
Atmosfera: produtividade, foco, design minimalista.`
    }

    if (cat.includes('celular') || cat.includes('smartphone') || cat.includes('phone') || name.includes('celular') || name.includes('smartphone')) {
      return `Cenário: lifestyle urbano contemporâneo.
Ambiente: café, co-working ou cenário urbano com boa iluminação.
Interação: mão segurando o smartphone naturalmente, tela ligada.
Atmosfera: conectividade, modernidade, estilo pessoal.`
    }

    if (cat.includes('tool') || cat.includes('ferramenta') || name.includes('furadeira') || name.includes('parafusadeira') || name.includes('serra')) {
      return `Cenário: oficina ou projeto de DIY/construção.
Ambiente: bancada de trabalho com materiais, iluminação direcional.
Interação: mãos com luvas usando o produto em uma peça de trabalho.
Atmosfera: competência, força, precisão profissional.`
    }

    // Fallback genérico
    return `Cenário: ambiente moderno e aspiracional adequado à categoria "${category}".
Ambiente: espaço limpo e bem iluminado que contextualize o uso natural do produto.
Interação: uma pessoa usando ou interagindo com o produto de forma orgânica.
Atmosfera: profissional, premium, convidativo.`
  }
}
