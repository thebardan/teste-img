import { Module } from '@nestjs/common'
import { GeminiTextProvider } from './providers/gemini/gemini-text.provider'
import { GeminiImageProvider } from './providers/gemini/gemini-image.provider'
import { GeminiArtProvider } from './providers/gemini/gemini-art.provider'
import { GeminiVisionProvider } from './providers/gemini/gemini-vision.provider'
import { ImageQAService } from './qa/image-qa.service'
import { PromptEngineService } from './prompt-engine/prompt-engine.service'
import { PromptMetricsService } from './prompt-engine/prompt-metrics.service'
import { PromptMetricsController } from './prompt-engine/prompt-metrics.controller'
import { SalesCopywriterAgent } from './agents/sales-copywriter.agent'
import { CopyDirectorAgent } from './agents/copy-director.agent'
import { BrandGuardianAgent } from './agents/brand-guardian.agent'
import { VisualDirectorAgent } from './agents/visual-director.agent'
import { VisualSystemAgent } from './agents/visual-system.agent'
import { QAAgent } from './agents/qa.agent'
import { BrandAssetsModule } from '../brand-assets/brand-assets.module'
import { BrandGovernanceModule } from '../brand-governance/brand-governance.module'

@Module({
  imports: [BrandAssetsModule, BrandGovernanceModule],
  controllers: [PromptMetricsController],
  providers: [
    GeminiTextProvider,
    GeminiImageProvider,
    GeminiArtProvider,
    GeminiVisionProvider,
    PromptEngineService,
    PromptMetricsService,
    SalesCopywriterAgent,
    CopyDirectorAgent,
    BrandGuardianAgent,
    VisualDirectorAgent,
    VisualSystemAgent,
    QAAgent,
    ImageQAService,
  ],
  exports: [
    GeminiTextProvider,
    GeminiImageProvider,
    GeminiArtProvider,
    GeminiVisionProvider,
    PromptEngineService,
    PromptMetricsService,
    SalesCopywriterAgent,
    CopyDirectorAgent,
    BrandGuardianAgent,
    VisualDirectorAgent,
    VisualSystemAgent,
    QAAgent,
    ImageQAService,
  ],
})
export class AiModule {}
