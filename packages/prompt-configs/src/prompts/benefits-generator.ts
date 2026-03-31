import type { PromptConfig } from '../index'

export const benefitsGeneratorPrompt: PromptConfig = {
  id: 'benefits-generator',
  version: '1.0.0',
  variables: ['productName', 'rawBenefits', 'targetAudience'],
  template: `Reescreva os benefícios do produto para uso em lâmina comercial.
Produto: {{productName}}
Benefícios originais: {{rawBenefits}}
Público: {{targetAudience}}

Regras:
- Máximo 5 benefícios
- Cada benefício: máximo 6 palavras
- Foco no valor para o usuário, não na feature técnica
- Comece com verbo no imperativo ou substantivo de impacto
- Idioma: português brasileiro

Responda APENAS com JSON válido:
{ "benefits": ["benefício 1", "benefício 2", "benefício 3"] }`,
  outputSchema: '{ benefits: string[] }',
}
