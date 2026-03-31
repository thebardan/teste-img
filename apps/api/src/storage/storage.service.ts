import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Minio from 'minio'
import type { Env } from '../config/env'

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

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
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
