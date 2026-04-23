import { Controller, Get, Param, Query, Res, NotFoundException } from '@nestjs/common'
import type { Response } from 'express'
import { StorageService } from './storage.service'

function mimeFor(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase()
  return (
    ext === 'png' ? 'image/png' :
    ext === 'webp' ? 'image/webp' :
    ext === 'svg' ? 'image/svg+xml' :
    ext === 'pdf' ? 'application/pdf' :
    ext === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' :
    'image/jpeg'
  )
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get('url/*')
  async presign(@Param('0') key: string, @Query('expiresIn') expiresIn?: string) {
    const secs = Math.max(60, Math.min(86400, Number(expiresIn) || 3600))
    const url = await this.storage.getPresignedUrl(key, secs).catch(() => null)
    if (!url) throw new NotFoundException(`Key ${key} not found`)
    return { url, key, expiresIn: secs }
  }

  @Get('stream/*')
  async stream(@Param('0') key: string, @Res() res: Response) {
    try {
      const { stream, size } = await this.storage.getStream(key)
      res.setHeader('Content-Type', mimeFor(key))
      res.setHeader('Cache-Control', 'private, max-age=600')
      res.setHeader('Content-Length', String(size))
      stream.on('error', (err) => {
        if (!res.headersSent) res.status(500).end()
        res.destroy(err)
      })
      stream.pipe(res)
    } catch {
      throw new NotFoundException(`Key ${key} not found`)
    }
  }
}
