import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { BrandGovernanceService, ClientBrandProfile } from './brand-governance.service'

@Controller('brand-governance')
export class BrandGovernanceController {
  constructor(private readonly service: BrandGovernanceService) {}

  // Tones

  @Get('tones')
  listTones() {
    return this.service.listTonePresets()
  }

  @Put('tones/:category')
  upsertTone(
    @Param('category') category: string,
    @Body() body: { tone: string; voice: string; isActive?: boolean },
  ) {
    return this.service.upsertTone(category, body)
  }

  @Delete('tones/:id')
  deleteTone(@Param('id') id: string) {
    return this.service.deleteTone(id)
  }

  // Channel CTAs

  @Get('channel-ctas')
  listChannelCtas() {
    return this.service.listChannelCtaPresets()
  }

  @Put('channel-ctas/:channel')
  upsertChannelCtas(
    @Param('channel') channel: string,
    @Body() body: { ctas: string[]; isActive?: boolean },
  ) {
    return this.service.upsertChannelCtas(channel, body)
  }

  @Delete('channel-ctas/:id')
  deleteChannelCtas(@Param('id') id: string) {
    return this.service.deleteChannelCtas(id)
  }

  // Client profile

  @Get('clients/:id/profile')
  async getClientProfile(@Param('id') id: string) {
    return { profile: await this.service.getClientProfile(id) }
  }

  @Put('clients/:id/profile')
  updateClientProfile(@Param('id') id: string, @Body() body: ClientBrandProfile) {
    return this.service.updateClientProfile(id, body)
  }
}
