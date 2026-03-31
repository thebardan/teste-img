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

  // ─── Products ─────────────────────────────────────────────────────────────
  const products = [
    {
      id: 'prod-wc1080',
      sku: 'WC1080',
      name: 'Webcam Multilaser Full HD 1080p',
      brand: 'Multilaser',
      category: 'Periféricos',
      subcategory: 'Webcams',
      description: 'Webcam profissional com resolução Full HD 1080p, microfone embutido e lente de vidro para imagens nítidas em videoconferências.',
      qrDestination: 'https://multilaser.com.br/webcam-1080p',
      images: ['products/wc1080/hero.jpg', 'products/wc1080/angle.jpg'],
      benefits: ['Qualidade Full HD 1080p', 'Microfone com cancelamento de ruído', 'Plug & Play universal', 'Compatível com Zoom, Teams e Meet', 'Suporte ajustável 360°'],
      specs: [
        { key: 'Resolução', value: '1920x1080', unit: 'px', group: 'Imagem' },
        { key: 'FPS', value: '30', unit: 'fps', group: 'Imagem' },
        { key: 'Ângulo de visão', value: '78', unit: '°', group: 'Óptica' },
        { key: 'Conexão', value: 'USB-A 2.0', group: 'Conectividade' },
      ],
    },
    {
      id: 'prod-hs350',
      sku: 'HS350',
      name: 'Headset Gamer Multilaser RGB',
      brand: 'Multilaser',
      category: 'Áudio',
      subcategory: 'Headsets',
      description: 'Headset gamer com som surround 7.1, iluminação RGB e microfone retrátil de alta precisão para jogos e comunicação.',
      qrDestination: 'https://multilaser.com.br/headset-gamer-rgb',
      images: ['products/hs350/hero.jpg'],
      benefits: ['Som surround virtual 7.1', 'Iluminação RGB personalizável', 'Microfone retrátil HD', 'Driver 50mm potente', 'Almofadas memory foam'],
      specs: [
        { key: 'Driver', value: '50', unit: 'mm', group: 'Áudio' },
        { key: 'Frequência', value: '20-20000', unit: 'Hz', group: 'Áudio' },
        { key: 'Impedância', value: '32', unit: 'Ω', group: 'Áudio' },
        { key: 'Conexão', value: 'USB + P2 3.5mm', group: 'Conectividade' },
      ],
    },
    {
      id: 'prod-kb200',
      sku: 'KB200',
      name: 'Teclado Multilaser Slim Wireless',
      brand: 'Multilaser',
      category: 'Periféricos',
      subcategory: 'Teclados',
      description: 'Teclado compacto sem fio com layout ABNT2, bateria de longa duração e perfil slim para home office e uso profissional.',
      qrDestination: 'https://multilaser.com.br/teclado-slim-wireless',
      images: ['products/kb200/hero.jpg'],
      benefits: ['Sem fio 2.4GHz estável', 'Bateria até 12 meses', 'Layout ABNT2 completo', 'Perfil slim ergonômico', 'Teclas silenciosas'],
      specs: [
        { key: 'Conectividade', value: 'Wireless 2.4GHz', group: 'Conectividade' },
        { key: 'Alcance', value: '10', unit: 'm', group: 'Conectividade' },
        { key: 'Bateria', value: 'AAA × 2 — até 12 meses', group: 'Energia' },
        { key: 'Layout', value: 'ABNT2 104 teclas', group: 'Teclado' },
      ],
    },
    {
      id: 'prod-ms100',
      sku: 'MS100',
      name: 'Mouse Sem Fio Multilaser Ergonômico',
      brand: 'Multilaser',
      category: 'Periféricos',
      subcategory: 'Mouses',
      description: 'Mouse sem fio ergonômico com DPI ajustável, design compacto e receptor nano USB para uso em deslocamento.',
      qrDestination: 'https://multilaser.com.br/mouse-sem-fio-ergo',
      images: ['products/ms100/hero.jpg'],
      benefits: ['DPI ajustável 800/1200/1600', 'Sem fio 2.4GHz', 'Design ergonômico', 'Receptor nano USB', 'Bateria AA até 18 meses'],
      specs: [
        { key: 'DPI', value: '800/1200/1600', group: 'Desempenho' },
        { key: 'Botões', value: '6', group: 'Ergonomia' },
        { key: 'Conexão', value: 'Wireless 2.4GHz', group: 'Conectividade' },
        { key: 'Bateria', value: 'AA × 1', group: 'Energia' },
      ],
    },
    {
      id: 'prod-sp420',
      sku: 'SP420',
      name: 'Caixa de Som Bluetooth Multilaser 20W',
      brand: 'Multilaser',
      category: 'Áudio',
      subcategory: 'Caixas de Som',
      description: 'Caixa de som portátil Bluetooth 5.0 com 20W RMS, resistência à água IPX5 e bateria de 8 horas de autonomia.',
      qrDestination: 'https://multilaser.com.br/caixa-som-bt-20w',
      images: ['products/sp420/hero.jpg', 'products/sp420/lifestyle.jpg'],
      benefits: ['20W RMS potente', 'Bluetooth 5.0 estável', 'Resistência à água IPX5', '8h de bateria', 'Chamadas via microfone embutido'],
      specs: [
        { key: 'Potência', value: '20', unit: 'W RMS', group: 'Áudio' },
        { key: 'Bluetooth', value: '5.0', group: 'Conectividade' },
        { key: 'Autonomia', value: '8', unit: 'h', group: 'Bateria' },
        { key: 'Resistência', value: 'IPX5', group: 'Durabilidade' },
      ],
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category,
        subcategory: p.subcategory,
        description: p.description,
        qrDestination: p.qrDestination,
        images: {
          create: p.images.map((url, i) => ({ url, isPrimary: i === 0, order: i })),
        },
        benefits: {
          create: p.benefits.map((text, i) => ({ text, order: i })),
        },
        specifications: {
          create: p.specs.map((s) => ({ key: s.key, value: s.value, unit: s.unit, group: s.group })),
        },
      },
    })
  }

  console.log('✅ Seed completed.')
  console.log(`   Users: 2 | Clients: 4 | Products: ${products.length} | Brand Assets: 2 | Templates: 2`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
