import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { TextGenerationResult } from '../text-generation.provider'
import type { Env } from '../../../config/env'

@Injectable()
export class GeminiTextProvider {
  private readonly logger = new Logger(GeminiTextProvider.name)
  private readonly apiKey: string
  private readonly model = 'gemini-2.0-flash'
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(private config: ConfigService<Env>) {
    this.apiKey = this.config.get('GEMINI_API_KEY') ?? ''
  }

  async generate(prompt: string, systemInstruction?: string): Promise<TextGenerationResult> {
    const start = Date.now()

    const body: any = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
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
      throw new Error(`Gemini API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    return { text, model: this.model, durationMs: Date.now() - start }
  }
}
