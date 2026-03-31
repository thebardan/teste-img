import type { PromptConfig } from '../index'

export const qaCheckPrompt: PromptConfig = {
  id: 'qa-check',
  version: '1.0.0',
  variables: ['headline', 'benefits', 'cta', 'hasLogo', 'hasQr', 'comparativesCount'],
  template: `Você é um QA especialista em materiais de marketing.
Revise o conteúdo da lâmina/slide abaixo e identifique problemas.

Headline: {{headline}}
Benefícios: {{benefits}}
CTA: {{cta}}
Tem logo: {{hasLogo}}
Tem QR: {{hasQr}}
Número de comparativos para revisão: {{comparativesCount}}

Verifique:
- Ortografia e gramática
- CTA presente e claro
- Logo presente
- Excesso de texto (headline > 10 palavras = problema)
- Comparativos que precisam de revisão humana

Responda APENAS com JSON:
{
  "passed": true,
  "score": 85,
  "flags": [
    { "severity": "error | warning | info", "code": "MISSING_CTA | LONG_HEADLINE | MISSING_LOGO | COMPARATIVE_REVIEW | SPELLING", "message": "descrição" }
  ]
}`,
  outputSchema: '{ passed: boolean, score: number, flags: Array<{ severity: string, code: string, message: string }> }',
}
