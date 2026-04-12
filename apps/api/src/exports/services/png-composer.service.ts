import { Injectable, Logger } from '@nestjs/common'
import sharp from 'sharp'

export interface PngLayer {
  type: 'background' | 'image' | 'overlay'
  buffer: Buffer
  x: number
  y: number
  width: number
  height: number
}

@Injectable()
export class PngComposerService {
  private readonly logger = new Logger(PngComposerService.name)

  async compose(
    width: number,
    height: number,
    layers: PngLayer[],
  ): Promise<Buffer> {
    let base = sharp({
      create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).png()

    const composites: sharp.OverlayOptions[] = []

    for (const layer of layers) {
      try {
        const resized = await sharp(layer.buffer)
          .resize(Math.round(layer.width), Math.round(layer.height), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()

        composites.push({
          input: resized,
          left: Math.round(layer.x),
          top: Math.round(layer.y),
        })
      } catch (err) {
        this.logger.warn(`Failed to composite layer: ${err}`)
      }
    }

    if (composites.length > 0) {
      base = base.composite(composites)
    }

    return base.toBuffer()
  }

  async createGradientBackground(
    width: number,
    height: number,
    colors: string[],
    angle = 135,
  ): Promise<Buffer> {
    const radian = (angle * Math.PI) / 180
    const x2 = Math.round(Math.cos(radian) * 100)
    const y2 = Math.round(Math.sin(radian) * 100)

    const stops = colors
      .map((c, i) => `<stop offset="${(i / (colors.length - 1)) * 100}%" stop-color="${c}"/>`)
      .join('')

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="${x2}%" y2="${y2}%">
          ${stops}
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`

    return sharp(Buffer.from(svg)).png().toBuffer()
  }
}
