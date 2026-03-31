import type { PromptConfig } from '../index'

export const visualDirectionPrompt: PromptConfig = {
  id: 'visual-direction',
  version: '1.0.0',
  variables: ['productName', 'category', 'headline', 'targetAudience', 'templateType'],
  template: `Você é um diretor de arte especialista em lâminas de vendas corporativas.
Crie a direção visual e o prompt de geração de imagem para a lâmina.

Produto: {{productName}}
Categoria: {{category}}
Headline: {{headline}}
Público: {{targetAudience}}
Template: {{templateType}}

Gere:
1. Descrição da direção de arte (paleta, mood, estilo)
2. Prompt para geração de imagem com Gemini

Regras do prompt de imagem:
- Deve reservar espaço negativo para texto (headline e CTA)
- Não incluir texto na imagem
- Estilo fotográfico comercial profissional ou render 3D limpo
- Iluminação de produto clara e atraente
- Fundo que combine com o template {{templateType}}

Responda APENAS com JSON:
{
  "artDirection": "descrição da direção de arte",
  "imagePrompt": "prompt completo em inglês para geração de imagem",
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "mood": "moderno | premium | tecnológico | doméstico | corporativo"
}`,
  outputSchema: '{ artDirection: string, imagePrompt: string, colorPalette: string[], mood: string }',
}
