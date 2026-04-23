import { Module } from '@nestjs/common'
import { GeminiTextProvider } from './providers/gemini/gemini-text.provider'
import { GeminiImageProvider } from './providers/gemini/gemini-image.provider'
import { GeminiArtProvider } from './providers/gemini/gemini-art.provider'
import { PromptEngineService } from './prompt-engine/prompt-engine.service'
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
  providers: [
    GeminiTextProvider,
    GeminiImageProvider,
    GeminiArtProvider,
    PromptEngineService,
    SalesCopywriterAgent,
    CopyDirectorAgent,
    BrandGuardianAgent,
    VisualDirectorAgent,
    VisualSystemAgent,
    QAAgent,
  ],
  exports: [
    GeminiTextProvider,
    GeminiImageProvider,
    GeminiArtProvider,
    PromptEngineService,
    SalesCopywriterAgent,
    CopyDirectorAgent,
    BrandGuardianAgent,
    VisualDirectorAgent,
    VisualSystemAgent,
    QAAgent,
  ],
})
export class AiModule {}
