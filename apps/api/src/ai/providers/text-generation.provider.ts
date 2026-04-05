export interface TextGenerationResult {
  text: string
  model: string
  durationMs: number
}

export abstract class TextGenerationProvider {
  abstract generate(prompt: string, systemInstruction?: string): Promise<TextGenerationResult>
}

export const TEXT_GENERATION_PROVIDER = Symbol('TEXT_GENERATION_PROVIDER')
