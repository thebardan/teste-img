import type { PromptConfig } from '../index'

export const salesHeadlinePrompt: PromptConfig = {
  id: 'sales-headline',
  version: '1.0.0',
  variables: ['productName', 'summary', 'targetAudience', 'channel'],
  template: `Você é um copywriter sênior especialista em lâminas de vendas B2B e B2C.
Crie headline e subtítulo para a lâmina do produto abaixo.

Produto: {{productName}}
Resumo: {{summary}}
Público: {{targetAudience}}
Canal: {{channel}}

Regras:
- Headline: máximo 8 palavras, impactante, vendável, sem clichês
- Subtítulo: máximo 15 palavras, complementa a headline, foco em benefício
- Tom: moderno, confiante, direto
- Idioma: português brasileiro

Responda APENAS com JSON válido:
{
  "headline": "headline aqui",
  "subtitle": "subtítulo aqui"
}`,
  outputSchema: '{ headline: string, subtitle: string }',
}
