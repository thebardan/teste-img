import { Module } from '@nestjs/common'
import { GeminiTextProvider } from './providers/gemini/gemini-text.provider'
import { GeminiImageProvider } from './providers/gemini/gemini-image.provider'
import { PromptEngineService } from './prompt-engine/prompt-engine.service'
import { SalesCopywriterAgent } from './agents/sales-copywriter.agent'
import { BrandGuardianAgent } from './agents/brand-guardian.agent'
import { VisualDirectorAgent } from './agents/visual-director.agent'
import { QAAgent } from './agents/qa.agent'
import { BrandAssetsModule } from '../brand-assets/brand-assets.module'

@Module({
  imports: [BrandAssetsModule],
  providers: [
    GeminiTextProvider,
    GeminiImageProvider,
    PromptEngineService,
    SalesCopywriterAgent,
    BrandGuardianAgent,
    VisualDirectorAgent,
    QAAgent,
  ],
  exports: [
    GeminiTextProvider,
    GeminiImageProvider,
    PromptEngineService,
    SalesCopywriterAgent,
    BrandGuardianAgent,
    VisualDirectorAgent,
    QAAgent,
  ],
})
export class AiModule {}
