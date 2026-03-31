import type { PromptConfig } from '../index'

export const slideStructurePrompt: PromptConfig = {
  id: 'slide-structure',
  version: '1.0.0',
  variables: ['clientName', 'products', 'channel', 'focus', 'objective'],
  template: `Você é um estrategista comercial sênior da Multilaser.
Monte a estrutura narrativa de uma apresentação comercial de 5 slides.

Cliente: {{clientName}}
Produtos: {{products}}
Canal: {{channel}}
Foco: {{focus}}
Objetivo: {{objective}}

Estrutura obrigatória dos slides:
1. cover — capa com proposta de valor principal
2. context — contexto de mercado e oportunidade para o cliente
3. products — os produtos e seus diferenciais
4. benefits — argumentos de venda e comparativos (se houver)
5. closing — fechamento com CTA e próximos passos

Para cada slide, defina: título principal, proposta de conteúdo (2-3 frases), ponto de destaque.

Responda APENAS com JSON:
{
  "slides": [
    { "type": "cover", "title": "...", "contentBrief": "...", "highlight": "..." },
    { "type": "context", "title": "...", "contentBrief": "...", "highlight": "..." },
    { "type": "products", "title": "...", "contentBrief": "...", "highlight": "..." },
    { "type": "benefits", "title": "...", "contentBrief": "...", "highlight": "..." },
    { "type": "closing", "title": "...", "contentBrief": "...", "highlight": "..." }
  ]
}`,
  outputSchema: '{ slides: Array<{ type: string, title: string, contentBrief: string, highlight: string }> }',
}
