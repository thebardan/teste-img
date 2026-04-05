import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env'

export interface ArtGenerationResult {
  imageBase64: string
  mimeType: string
  model: string
  durationMs: number
}

@Injectable()
export class GeminiArtProvider {
  private readonly logger = new Logger(GeminiArtProvider.name)
  private readonly apiKey: string
  private readonly model: string
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(private config: ConfigService<Env>) {
    this.apiKey = this.config.get('GEMINI_API_KEY') ?? ''
    this.model = this.config.get('ART_MODEL') ?? 'gemini-3.1-flash-image-preview'
  }

  async generate(
    prompt: string,
    referenceImages: { base64: string; mimeType: string }[],
  ): Promise<ArtGenerationResult> {
    const start = Date.now()
    const parts: any[] = [{ text: prompt }]
    for (const img of referenceImages) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } })
    }
    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }
    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Gemini Art API error ${response.status}: ${err}`)
    }
    const data = await response.json()
    const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)
    if (!imagePart) throw new Error('No image in Gemini Art response')
    return {
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? 'image/png',
      model: this.model,
      durationMs: Date.now() - start,
    }
  }
}
