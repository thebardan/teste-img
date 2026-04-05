import { QAAgent } from './qa.agent'

const mockPromptEngine = {
  render: jest.fn().mockResolvedValue('QA check prompt'),
}

const mockTextProvider = {
  generate: jest.fn().mockResolvedValue('No issues found.'),
}

// QAAgent uses PromptEngineService internally via runAiCheck
// Patch constructor to avoid full DI setup
function makeAgent() {
  const agent = new QAAgent(mockPromptEngine as any)
  // Patch the private method to avoid real LLM calls in unit tests
  ;(agent as any).runAiCheck = jest.fn().mockResolvedValue([])
  return agent
}

describe('QAAgent — Sales Sheet', () => {
  let agent: QAAgent

  beforeEach(() => {
    jest.clearAllMocks()
    agent = makeAgent()
  })

  it('passes a complete, valid sales sheet', async () => {
    const content = {
      headline: 'Produto Incrível Que Muda Tudo',
      subtitle: 'O melhor da categoria',
      benefits: ['Benefício 1', 'Benefício 2', 'Benefício 3'],
      cta: 'Peça já',
      qrUrl: 'https://multilaser.com.br/produto',
      logoUrl: 'https://cdn.multilaser.com.br/logo.svg',
    }
    const result = await agent.checkSalesSheet(content, 'Produto X')
    expect(result.passed).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(70)
  })

  it('flags missing headline as ERROR', async () => {
    const content = {
      headline: '',
      subtitle: 'Subtítulo',
      benefits: ['B1', 'B2', 'B3'],
      cta: 'Compre agora',
      qrUrl: 'https://multilaser.com.br',
      logoUrl: 'https://cdn.multilaser.com.br/logo.svg',
    }
    const result = await agent.checkSalesSheet(content, 'Produto X')
    const headlineCheck = result.checks.find((c) => c.rule === 'headline')
    expect(headlineCheck?.passed).toBe(false)
    expect(headlineCheck?.level).toBe('ERROR')
  })

  it('flags missing CTA as ERROR', async () => {
    const content = {
      headline: 'Headline válida aqui',
      subtitle: 'Subtítulo',
      benefits: ['B1', 'B2', 'B3'],
      cta: '',
      qrUrl: 'https://multilaser.com.br',
      logoUrl: 'https://cdn.multilaser.com.br/logo.svg',
    }
    const result = await agent.checkSalesSheet(content, 'Produto X')
    const ctaCheck = result.checks.find((c) => c.rule === 'cta')
    expect(ctaCheck?.passed).toBe(false)
  })

  it('flags fewer than 3 benefits', async () => {
    const content = {
      headline: 'Headline válida aqui',
      subtitle: 'Subtítulo',
      benefits: ['Só um benefício'],
      cta: 'Compre',
      qrUrl: 'https://multilaser.com.br',
      logoUrl: 'https://cdn.multilaser.com.br/logo.svg',
    }
    const result = await agent.checkSalesSheet(content, 'Produto X')
    const benefitsCheck = result.checks.find((c) => c.rule === 'benefits')
    expect(benefitsCheck?.passed).toBe(false)
  })
})

describe('QAAgent — Presentation', () => {
  let agent: QAAgent

  beforeEach(() => {
    jest.clearAllMocks()
    agent = makeAgent()
  })

  const makeSlides = () => [
    { order: 1, content: { type: 'cover', title: 'Proposta Comercial', body: [] } },
    { order: 2, content: { type: 'context', title: 'Contexto', body: ['item'] } },
    { order: 3, content: { type: 'products', title: 'Produtos', body: ['produto'] } },
    { order: 4, content: { type: 'benefits', title: 'Benefícios', body: ['benefício'] } },
    { order: 5, content: { type: 'closing', title: 'Fechamento', cta: 'Entre em contato', body: [] } },
  ]

  it('passes a valid 5-slide presentation', async () => {
    const result = await agent.checkPresentation(makeSlides(), 'Apresentação Cliente X')
    expect(result.passed).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(70)
  })

  it('flags presentations with wrong slide count', async () => {
    const slides = makeSlides().slice(0, 3)
    const result = await agent.checkPresentation(slides, 'Apresentação')
    const countCheck = result.checks.find((c) => c.rule === 'slide-count')
    expect(countCheck?.passed).toBe(false)
  })

  it('reduces score when title is missing', async () => {
    const result = await agent.checkPresentation(makeSlides(), '')
    const titleCheck = result.checks.find((c) => c.rule === 'title')
    expect(titleCheck?.passed).toBe(false)
  })
})
