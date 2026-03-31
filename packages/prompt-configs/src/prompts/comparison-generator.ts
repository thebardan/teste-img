import type { PromptConfig } from '../index'

export const comparisonGeneratorPrompt: PromptConfig = {
  id: 'comparison-generator',
  version: '1.0.0',
  variables: ['productName', 'specs', 'benefits', 'category'],
  template: `Você é um analista de mercado. Sugira comparativos comerciais para o produto.
IMPORTANTE: Separe claramente o que é fato documentado do que é inferência de mercado.

Produto: {{productName}}
Specs: {{specs}}
Benefícios: {{benefits}}
Categoria: {{category}}

Gere comparativos de atributos onde o produto se destaca.
NUNCA invente dados numéricos precisos de concorrentes — marque como sugestão para revisão humana.

Responda APENAS com JSON:
{
  "comparatives": [
    {
      "attribute": "nome do atributo",
      "ourValue": "valor do nosso produto",
      "competitorValue": "valor estimado do mercado ou null",
      "flaggedForReview": true,
      "note": "fonte ou motivo da inferência"
    }
  ]
}`,
  outputSchema: '{ comparatives: Array<{ attribute: string, ourValue: string, competitorValue: string | null, flaggedForReview: boolean, note: string }> }',
}
