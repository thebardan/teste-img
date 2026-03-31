import type { PromptConfig } from '../index'

export const slideCopyPrompt: PromptConfig = {
  id: 'slide-copy',
  version: '1.0.0',
  variables: ['slideType', 'title', 'contentBrief', 'productContext', 'clientName', 'channel'],
  template: `Escreva o copy final para o slide abaixo.

Tipo: {{slideType}}
Título: {{title}}
Brief: {{contentBrief}}
Contexto do produto: {{productContext}}
Cliente: {{clientName}}
Canal: {{channel}}

Regras:
- Subtítulo: máximo 15 palavras
- Bullets: máximo 4 itens, máximo 8 palavras cada
- Tom: profissional, comercial, direto
- Idioma: português brasileiro

Responda APENAS com JSON:
{
  "subtitle": "subtítulo do slide",
  "body": ["bullet 1", "bullet 2", "bullet 3"],
  "cta": "CTA se for slide de closing, null caso contrário"
}`,
  outputSchema: '{ subtitle: string, body: string[], cta: string | null }',
}
