export * from './prompts/product-summary'
export * from './prompts/sales-headline'
export * from './prompts/benefits-generator'
export * from './prompts/sales-sheet-copy'
export * from './prompts/visual-direction'
export * from './prompts/image-generation'
export * from './prompts/slide-structure'
export * from './prompts/slide-copy'
export * from './prompts/comparison-generator'
export * from './prompts/qa-check'

export interface PromptConfig {
  id: string
  version: string
  template: string
  variables: string[]
  outputSchema?: string
}

export function renderPrompt(config: PromptConfig, vars: Record<string, string>): string {
  return config.variables.reduce(
    (tpl, key) => tpl.replaceAll(`{{${key}}}`, vars[key] ?? ''),
    config.template,
  )
}
