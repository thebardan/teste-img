import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { ImageGenerationResult } from '../image-generation.provider'
import type { Env } from '../../../config/env'

@Injectable()
export class GeminiImageProvider {
  private readonly logger = new Logger(GeminiImageProvider.name)
  private readonly apiKey: string
  private readonly model = 'gemini-2.0-flash-exp-image-generation'
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(private config: ConfigService<Env>) {
    this.apiKey = this.config.get('GEMINI_API_KEY') ?? ''
  }

  async generate(prompt: string, referenceImageBase64?: string): Promise<ImageGenerationResult> {
    const start = Date.now()

    const parts: any[] = [{ text: prompt }]
    if (referenceImageBase64) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: referenceImageBase64 } })
    }

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Gemini Image API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)
    if (!imagePart) throw new Error('No image in Gemini response')

    return {
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? 'image/png',
      model: this.model,
      durationMs: Date.now() - start,
    }
  }
}
