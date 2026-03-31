import type { PromptConfig } from '../index'

export const imageGenerationPrompt: PromptConfig = {
  id: 'image-generation',
  version: '1.0.0',
  variables: ['basePrompt', 'artDirection', 'templateType', 'mood'],
  template: `{{basePrompt}}

Style: {{mood}}, commercial photography, product marketing material.
Art direction: {{artDirection}}
Template context: {{templateType}} sales sheet layout.
Requirements: Leave negative space on right side for text overlay. No text in image. Professional lighting. High resolution.`,
  outputSchema: 'binary image',
}
