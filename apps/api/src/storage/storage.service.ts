import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Minio from 'minio'
import type { Env } from '../config/env'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])

const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
])

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
const MAX_DOCUMENT_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB

export type UploadCategory = 'image' | 'document' | 'any'

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name)
  private client: Minio.Client
  private bucket: string

  constructor(private config: ConfigService<Env>) {}

  async onModuleInit() {
    this.bucket = this.config.get('MINIO_BUCKET')!
    this.client = new Minio.Client({
      endPoint: this.config.get('MINIO_ENDPOINT')!,
      port: this.config.get<number>('MINIO_PORT'),
      useSSL: this.config.get<boolean>('MINIO_USE_SSL'),
      accessKey: this.config.get('MINIO_ACCESS_KEY')!,
      secretKey: this.config.get('MINIO_SECRET_KEY')!,
    })
    await this.ensureBucket()
  }

  private async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket)
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1')
        this.logger.log(`Created bucket: ${this.bucket}`)
      }
    } catch (err) {
      this.logger.warn(`MinIO bucket check failed (storage may be unavailable): ${err}`)
    }
  }

  /**
   * Validate file before upload.
   * @param buffer - File buffer
   * @param contentType - MIME type declared by the caller
   * @param category - Which allow-list to check ('image' | 'document' | 'any')
   */
  validateUpload(buffer: Buffer, contentType: string, category: UploadCategory = 'any') {
    if (category === 'image') {
      if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
        throw new BadRequestException(
          `Unsupported image type: ${contentType}. Allowed: ${[...ALLOWED_IMAGE_TYPES].join(', ')}`,
        )
      }
      if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw new PayloadTooLargeException(
          `Image exceeds max size of ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB`,
        )
      }
    } else if (category === 'document') {
      if (!ALLOWED_DOCUMENT_TYPES.has(contentType)) {
        throw new BadRequestException(
          `Unsupported document type: ${contentType}. Allowed: ${[...ALLOWED_DOCUMENT_TYPES].join(', ')}`,
        )
      }
      if (buffer.length > MAX_DOCUMENT_SIZE_BYTES) {
        throw new PayloadTooLargeException(
          `Document exceeds max size of ${MAX_DOCUMENT_SIZE_BYTES / 1024 / 1024} MB`,
        )
      }
    }
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
    category: UploadCategory = 'any',
  ): Promise<string> {
    this.validateUpload(buffer, contentType, category)
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    })
    return key
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds)
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key)
  }

  async getBuffer(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
}
