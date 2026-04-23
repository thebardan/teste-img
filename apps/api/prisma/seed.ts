import { PrismaClient, TemplateType, BrandAssetType, BackgroundType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Users ───────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@multilaser.com.br' },
    update: {},
    create: {
      email: 'admin@multilaser.com.br',
      name: 'Admin Multi',
      role: 'ADMIN',
    },
  })

  await prisma.user.upsert({
    where: { email: 'editor@multilaser.com.br' },
    update: {},
    create: {
      email: 'editor@multilaser.com.br',
      name: 'Editor Marketing',
      role: 'EDITOR',
    },
  })

  // ─── Clients ─────────────────────────────────────────────────────────────
  await prisma.client.createMany({
    data: [
      { name: 'Magazine Luiza', segment: 'Varejo', channel: 'Varejo Nacional' },
      { name: 'Americanas', segment: 'Varejo', channel: 'Varejo Nacional' },
      { name: 'Distribuidor ABC', segment: 'Distribuição', channel: 'Distribuidor' },
      { name: 'Fast Shop', segment: 'Varejo Premium', channel: 'Varejo Especializado' },
    ],
    skipDuplicates: true,
  })

  // ─── Brand Assets ─────────────────────────────────────────────────────────
  await prisma.brandAsset.upsert({
    where: { id: 'brand-multilaser-light' },
    update: {},
    create: {
      id: 'brand-multilaser-light',
      name: 'Multilaser — Fundo claro',
      type: BrandAssetType.LOGO,
      url: 'brand/logos/multilaser-dark.svg',
      format: 'SVG',
      bestOn: BackgroundType.LIGHT,
      description: 'Logo principal versão escura, para fundos claros',
      rules: {
        create: [
          { condition: "background === 'LIGHT'", score: 100, notes: 'Versão principal para fundo branco' },
          { condition: "background === 'ANY'", score: 70, notes: 'Fallback genérico' },
        ],
      },
    },
  })

  await prisma.brandAsset.upsert({
    where: { id: 'brand-multilaser-dark' },
    update: {},
    create: {
      id: 'brand-multilaser-dark',
      name: 'Multilaser — Fundo escuro',
      type: BrandAssetType.LOGO,
      url: 'brand/logos/multilaser-white.svg',
      format: 'SVG',
      bestOn: BackgroundType.DARK,
      description: 'Logo branca para fundos escuros ou coloridos',
      rules: {
        create: [
          { condition: "background === 'DARK'", score: 100, notes: 'Versão para fundo escuro' },
          { condition: "background === 'COLORED'", score: 90, notes: 'Boa visibilidade em fundos coloridos' },
        ],
      },
    },
  })

  // ─── Templates ────────────────────────────────────────────────────────────
  await prisma.template.upsert({
    where: { id: 'tpl-sales-sheet-horizontal' },
    update: {},
    create: {
      id: 'tpl-sales-sheet-horizontal',
      name: 'Lâmina Horizontal',
      type: TemplateType.SALES_SHEET_HORIZONTAL,
      description: 'Lâmina de vendas no formato paisagem A4',
      zonesConfig: {
        imageZone: { x: 0, y: 0, width: '60%', height: '100%' },
        headlineZone: { x: '62%', y: '5%', width: '35%', height: '20%' },
        benefitsZone: { x: '62%', y: '30%', width: '35%', height: '40%' },
        logoZone: { x: '62%', y: '75%', width: '15%', height: '10%' },
        qrZone: { x: '80%', y: '72%', width: '15%', height: '20%' },
        ctaZone: { x: '62%', y: '88%', width: '35%', height: '8%' },
      },
    },
  })

  await prisma.template.upsert({
    where: { id: 'tpl-deck-corporate' },
    update: {},
    create: {
      id: 'tpl-deck-corporate',
      name: 'Deck Corporativo',
      type: TemplateType.DECK_CORPORATE,
      description: 'Apresentação corporativa padrão Multilaser',
      zonesConfig: {
        heroZone: { x: 0, y: 0, width: '100%', height: '45%' },
        titleZone: { x: '3%', y: '47%', width: '94%', height: '14%' },
        bodyZone: { x: '3%', y: '63%', width: '94%', height: '22%' },
        logoZone: { x: '85%', y: '3%', width: '12%', height: '10%' },
        footerZone: { x: 0, y: '92%', width: '100%', height: '8%' },
      },
    },
  })

  await prisma.template.upsert({
    where: { id: 'tpl-sales-sheet-vertical' },
    update: {},
    create: {
      id: 'tpl-sales-sheet-vertical',
      name: 'Lâmina Vertical',
      type: TemplateType.SALES_SHEET_VERTICAL,
      description: 'Lâmina de vendas no formato retrato',
      zonesConfig: {
        imageZone: { x: 0, y: 0, width: '100%', height: '50%' },
        headlineZone: { x: '4%', y: '52%', width: '92%', height: '12%' },
        benefitsZone: { x: '4%', y: '66%', width: '92%', height: '20%' },
        logoZone: { x: '4%', y: '88%', width: '18%', height: '8%' },
        qrZone: { x: '75%', y: '86%', width: '20%', height: '11%' },
        ctaZone: { x: '25%', y: '88%', width: '46%', height: '8%' },
      },
    },
  })

  await prisma.template.upsert({
    where: { id: 'tpl-sales-sheet-a4' },
    update: {},
    create: {
      id: 'tpl-sales-sheet-a4',
      name: 'Lâmina A4',
      type: TemplateType.SALES_SHEET_A4,
      description: 'Lâmina de vendas no formato A4 completo, ideal para impressão',
      zonesConfig: {
        imageZone: { x: '4%', y: '4%', width: '42%', height: '55%' },
        specsZone: { x: '4%', y: '62%', width: '42%', height: '30%' },
        headlineZone: { x: '50%', y: '4%', width: '46%', height: '15%' },
        benefitsZone: { x: '50%', y: '22%', width: '46%', height: '38%' },
        comparativeZone: { x: '50%', y: '63%', width: '46%', height: '18%' },
        logoZone: { x: '50%', y: '84%', width: '20%', height: '9%' },
        qrZone: { x: '74%', y: '83%', width: '16%', height: '12%' },
        ctaZone: { x: '50%', y: '94%', width: '46%', height: '5%' },
      },
    },
  })

  await prisma.template.upsert({
    where: { id: 'tpl-deck-retail' },
    update: {},
    create: {
      id: 'tpl-deck-retail',
      name: 'Deck Varejo',
      type: TemplateType.DECK_RETAIL,
      description: 'Apresentação focada em canal varejo — destaque em preço e benefícios',
      zonesConfig: {
        heroZone: { x: 0, y: 0, width: '50%', height: '100%' },
        titleZone: { x: '52%', y: '5%', width: '44%', height: '16%' },
        highlightZone: { x: '52%', y: '24%', width: '44%', height: '20%' },
        bodyZone: { x: '52%', y: '47%', width: '44%', height: '28%' },
        logoZone: { x: '52%', y: '80%', width: '15%', height: '10%' },
        qrZone: { x: '72%', y: '78%', width: '14%', height: '14%' },
        footerZone: { x: 0, y: '93%', width: '100%', height: '7%' },
      },
    },
  })

  await prisma.template.upsert({
    where: { id: 'tpl-deck-premium' },
    update: {},
    create: {
      id: 'tpl-deck-premium',
      name: 'Deck Premium',
      type: TemplateType.DECK_PREMIUM,
      description: 'Apresentação premium para clientes de alto valor — layout editorial',
      zonesConfig: {
        fullBleedZone: { x: 0, y: 0, width: '100%', height: '40%' },
        titleZone: { x: '6%', y: '42%', width: '88%', height: '14%' },
        taglineZone: { x: '6%', y: '58%', width: '88%', height: '8%' },
        bodyZone: { x: '6%', y: '68%', width: '55%', height: '18%' },
        sidebarZone: { x: '65%', y: '68%', width: '29%', height: '18%' },
        logoZone: { x: '6%', y: '89%', width: '16%', height: '8%' },
        footerZone: { x: 0, y: '95%', width: '100%', height: '5%' },
      },
    },
  })

  await prisma.template.upsert({
    where: { id: 'tpl-deck-distributor' },
    update: {},
    create: {
      id: 'tpl-deck-distributor',
      name: 'Deck Distribuidor',
      type: TemplateType.DECK_DISTRIBUTOR,
      description: 'Apresentação para canal distribuição — foco em mix, giro e margem',
      zonesConfig: {
        headerZone: { x: 0, y: 0, width: '100%', height: '15%' },
        titleZone: { x: '4%', y: '17%', width: '92%', height: '12%' },
        col1Zone: { x: '4%', y: '32%', width: '28%', height: '50%' },
        col2Zone: { x: '36%', y: '32%', width: '28%', height: '50%' },
        col3Zone: { x: '68%', y: '32%', width: '28%', height: '50%' },
        logoZone: { x: '4%', y: '85%', width: '16%', height: '10%' },
        footerZone: { x: 0, y: '93%', width: '100%', height: '7%' },
      },
    },
  })

  // ─── Tone Presets (Brand Governance) ────────────────────────────────────
  const tonePresets: Array<{ category: string; tone: string; voice: string }> = [
    { category: 'gamer', tone: 'intenso, provocador, cheio de adrenalina — fala com quem vive para ganhar', voice: 'guerreiro digital implacável' },
    { category: 'áudio', tone: 'sensorial, evocativo, quase poético — desperta emoções e memórias através do som', voice: 'maestro da experiência sonora' },
    { category: 'smartphone', tone: 'conectado, dinâmico e aspiracional — a vida na palma da mão, sem limites', voice: 'companheiro do estilo de vida moderno' },
    { category: 'notebook', tone: 'produtivo, inteligente e confiável — fala com quem precisa de desempenho real', voice: 'parceiro de alta performance' },
    { category: 'câmera', tone: 'criativo, apaixonado, artístico — para quem vê o mundo de um jeito especial', voice: 'contador de histórias visuais' },
    { category: 'smart home', tone: 'moderno, prático e futurista — o conforto inteligente que você sempre quis', voice: 'arquiteto do lar inteligente' },
    { category: 'fitness', tone: 'motivador, enérgico e desafiador — empurra os limites, celebra cada conquista', voice: 'coach pessoal incansável' },
    { category: 'ferramenta', tone: 'direto, confiável e robusto — fala com quem faz acontecer no mundo real', voice: 'mestre do ofício' },
    { category: 'cozinha', tone: 'acolhedor, saboroso e inspirador — cozinhar é um ato de amor', voice: 'chef do cotidiano' },
    { category: 'eletrodoméstico', tone: 'prático, eficiente e reassegurador — facilita a vida e economiza tempo', voice: 'assistente silencioso do lar' },
  ]

  for (const p of tonePresets) {
    await prisma.tonePreset.upsert({
      where: { category: p.category },
      update: p,
      create: p,
    })
  }

  // ─── Channel CTA Presets ─────────────────────────────────────────────────
  const ctaPresets: Array<{ channel: string; ctas: string[] }> = [
    {
      channel: 'Varejo',
      ctas: ['Compre agora e economize', 'Adquira na loja mais próxima', 'Leve para casa hoje', 'Aproveite a oferta da loja'],
    },
    {
      channel: 'Distribuidor',
      ctas: ['Solicite proposta comercial', 'Fale com nosso representante', 'Consulte tabela de preços', 'Peça seu kit demonstração'],
    },
    {
      channel: 'Varejo Premium',
      ctas: ['Experimente antes de comprar', 'Consulte nosso especialista', 'Agende uma demonstração exclusiva', 'Descubra o premium Multilaser'],
    },
    {
      channel: 'E-commerce',
      ctas: ['Compre com 1 clique', 'Adicione ao carrinho agora', 'Frete grátis — compre já', 'Aproveite no site oficial'],
    },
  ]

  for (const p of ctaPresets) {
    await prisma.channelCtaPreset.upsert({
      where: { channel: p.channel },
      update: { ctas: p.ctas as any },
      create: { channel: p.channel, ctas: p.ctas as any },
    })
  }

  console.log('✅ Seed completed.')
  console.log('   Users: 2 | Clients: 4 | Brand Assets: 2 | Templates: 7')
  console.log(`   TonePresets: ${tonePresets.length} | ChannelCTAs: ${ctaPresets.length}`)
  console.log('   Products will be created automatically from Google Drive sync.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
