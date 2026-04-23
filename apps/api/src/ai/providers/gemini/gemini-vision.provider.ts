import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env'

export interface VisionAnalysisInput {
  prompt: string
  imageBase64: string
  mimeType?: string
}

@Injectable()
export class GeminiVisionProvider {
  private readonly logger = new Logger(GeminiVisionProvider.name)
  private readonly apiKey: string
  private readonly model = 'gemini-2.0-flash'
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(private config: ConfigService<Env>) {
    this.apiKey = this.config.get('GEMINI_API_KEY') ?? ''
  }

  async analyze(input: VisionAnalysisInput): Promise<string> {
    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: input.prompt },
            {
              inlineData: {
                mimeType: input.mimeType ?? 'image/jpeg',
                data: input.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.2 },
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
      throw new Error(`Gemini Vision API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('No text in Gemini Vision response')
    return text
  }
}
