import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../config/env'

export interface EmbeddingResult {
  values: number[]
  model: string
  durationMs: number
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)
  private readonly apiKey: string
  private readonly model: string
  private readonly dimensions: number
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(private config: ConfigService<Env>) {
    this.apiKey = this.config.get('GEMINI_API_KEY') ?? ''
    this.model = this.config.get('EMBEDDING_MODEL') ?? 'gemini-embedding-2-preview'
    this.dimensions = this.config.get('EMBEDDING_DIMENSIONS') ?? 256
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const start = Date.now()

    const body = {
      model: `models/${this.model}`,
      content: { parts: [{ text }] },
      outputDimensionality: this.dimensions,
    }

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Gemini Embedding API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const values: number[] = data.embedding?.values ?? []

    return { values, model: this.model, durationMs: Date.now() - start }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = []
    for (let i = 0; i < texts.length; i += 10) {
      const batch = texts.slice(i, i + 10)
      const batchResults = await Promise.all(batch.map((t) => this.embed(t)))
      results.push(...batchResults)
    }
    return results
  }
}
