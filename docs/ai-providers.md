# AI Providers Guide

## Overview

The AI layer is fully abstracted. Providers implement simple interfaces, and agents call them without knowing which model is in use.

## Provider Interfaces

### TextGenerationProvider

```typescript
interface TextGenerationProvider {
  generate(prompt: string, options?: TextGenOptions): Promise<string>
}
```

### ImageGenerationProvider

```typescript
interface ImageGenerationProvider {
  generate(prompt: string, referenceImages?: string[], options?: ImageGenOptions): Promise<Buffer>
}
```

## Current Implementations

### GeminiTextProvider (`src/ai/providers/gemini/gemini-text.provider.ts`)

Uses Google Gemini's `gemini-2.0-flash` model for text generation. Automatically parses JSON-fenced responses when the prompt requests structured output.

### GeminiImageProvider (`src/ai/providers/gemini/gemini-image.provider.ts`)

Uses `gemini-2.0-flash-preview-image-generation` for image generation. Accepts product reference images and a visual direction prompt.

## Adding a New Provider

1. Create `src/ai/providers/<name>/<name>-text.provider.ts`:

```typescript
import { Injectable } from '@nestjs/common'

@Injectable()
export class OpenAITextProvider {
  async generate(prompt: string): Promise<string> {
    // implement OpenAI call
  }
}
```

2. Export it from the relevant module.

3. In `AiModule`, swap the provider:

```typescript
providers: [
  OpenAITextProvider,  // instead of GeminiTextProvider
  ...
]
```

Agents receive the provider via constructor injection — no changes needed in agents.

## Prompt Engine

The `PromptEngineService` loads prompts from `src/ai/prompt-engine/prompts/` and interpolates variables:

```typescript
const result = await promptEngine.run('sales-headline', {
  productName: 'Headset Pro',
  category: 'Áudio',
  benefits: 'Som surround, bateria 30h',
})
```

`result.rawOutput` — raw LLM response string
`result.parsedOutput` — JSON parsed from the response (if JSON-fenced)

### Adding a New Prompt

Create `src/ai/prompt-engine/prompts/<name>.prompt.json`:

```json
{
  "name": "my-prompt",
  "version": "1.0",
  "model": "text",
  "template": "Generate a {{tone}} headline for {{productName}} in the {{category}} category.",
  "outputFormat": "json"
}
```

Then call it with:
```typescript
promptEngine.run('my-prompt', { tone: 'energetic', productName: 'X', category: 'Y' })
```

## Inference Logs

Every AI call creates an `InferenceLog` record in the database with:
- `prompt` — the rendered prompt
- `rawResponse` — the raw model output
- `model` — which model was used
- `tokensUsed` — token count (when available)
- `durationMs` — latency

This enables full prompt auditability and iterative improvement.
