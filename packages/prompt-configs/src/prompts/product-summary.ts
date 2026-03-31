import type { PromptConfig } from '../index'

export const productSummaryPrompt: PromptConfig = {
  id: 'product-summary',
  version: '1.0.0',
  variables: ['productName', 'sku', 'category', 'description', 'benefits', 'specs'],
  template: `Você é um especialista em marketing de produto da Multilaser.
Analise os dados abaixo e produza um resumo comercial estruturado em JSON.

Produto: {{productName}} (SKU: {{sku}})
Categoria: {{category}}
Descrição: {{description}}
Benefícios declarados: {{benefits}}
Especificações: {{specs}}

Responda APENAS com JSON válido no formato:
{
  "summary": "resumo comercial em 2-3 frases",
  "keyStrengths": ["força 1", "força 2", "força 3"],
  "targetAudience": "descrição do público-alvo",
  "primaryUseCase": "caso de uso principal"
}`,
  outputSchema: '{ summary: string, keyStrengths: string[], targetAudience: string, primaryUseCase: string }',
}
