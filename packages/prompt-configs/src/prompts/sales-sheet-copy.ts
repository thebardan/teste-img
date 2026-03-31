import type { PromptConfig } from '../index'

export const salesSheetCopyPrompt: PromptConfig = {
  id: 'sales-sheet-copy',
  version: '1.0.0',
  variables: ['productName', 'headline', 'benefits', 'channel'],
  template: `Crie o CTA (call to action) para a lâmina do produto.
Produto: {{productName}}
Headline: {{headline}}
Benefícios: {{benefits}}
Canal: {{channel}}

Regras:
- CTA: máximo 4 palavras
- Deve gerar ação imediata
- Exemplos de tom: "Peça agora", "Saiba mais", "Fale com o representante"

Responda APENAS com JSON: { "cta": "texto do CTA" }`,
  outputSchema: '{ cta: string }',
}
