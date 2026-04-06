import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { google, drive_v3 } from 'googleapis'
import type { Env } from '../../config/env'
import { Readable } from 'stream'

export interface DriveFileInfo {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

export interface DriveFolderInfo {
  id: string
  name: string
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name)
  private drive: drive_v3.Drive

  constructor(private config: ConfigService<Env>) {
    const email = this.config.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const key = this.config.get('GOOGLE_SERVICE_ACCOUNT_KEY')

    if (!email || !key) {
      this.logger.warn('Google Drive credentials not configured')
      return
    }

    // ConfigService may deliver literal \n (two chars) — replace with real newlines
    const pemKey = key.split('\\n').join('\n')
    this.logger.log(`Drive auth: email=${email}, key starts with ${pemKey.substring(0, 27)}`)

    const auth = new google.auth.JWT({
      email,
      key: pemKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })

    this.drive = google.drive({ version: 'v3', auth })
  }

  async listSubfolders(parentFolderId: string): Promise<DriveFolderInfo[]> {
    const folders: DriveFolderInfo[] = []
    let pageToken: string | undefined

    do {
      const res = await this.drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'nextPageToken, files(id, name)',
        pageSize: 100,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })

      for (const f of res.data.files ?? []) {
        if (f.id && f.name) folders.push({ id: f.id, name: f.name })
      }
      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)

    return folders
  }

  async listImages(folderId: string): Promise<DriveFileInfo[]> {
    const images: DriveFileInfo[] = []
    let pageToken: string | undefined

    do {
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
        pageSize: 100,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })

      for (const f of res.data.files ?? []) {
        if (f.id && f.name && f.mimeType && f.modifiedTime) {
          images.push({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime,
          })
        }
      }
      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)

    return images
  }

  async listImagesRecursive(folderId: string): Promise<DriveFileInfo[]> {
    const images = await this.listImages(folderId)
    // Keep only web-compatible image formats
    const WEB_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
    const webImages = images.filter((img) => WEB_MIMES.has(img.mimeType))
    const subfolders = await this.listSubfolders(folderId)
    for (const sub of subfolders) {
      const subImages = await this.listImagesRecursive(sub.id)
      webImages.push(...subImages)
    }
    return webImages
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const res = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    )

    const chunks: Buffer[] = []
    const stream = res.data as Readable
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
}
