export interface ImageGenerationResult {
  imageBase64: string
  mimeType: string
  model: string
  durationMs: number
}

export abstract class ImageGenerationProvider {
  abstract generate(prompt: string, referenceImageBase64?: string): Promise<ImageGenerationResult>
}

export const IMAGE_GENERATION_PROVIDER = Symbol('IMAGE_GENERATION_PROVIDER')
