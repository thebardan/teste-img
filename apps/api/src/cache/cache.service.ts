import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { createHash } from 'crypto'
import type { Env } from '../config/env'

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name)
  private client: Redis | null = null
  private readonly disabled: boolean

  constructor(private config: ConfigService<Env>) {
    const url = this.config.get<string>('REDIS_URL')
    this.disabled = !url || process.env.AI_CACHE_DISABLED === 'true'
    if (!this.disabled && url) {
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
      })
      this.client.on('error', (err) => {
        // Redis down: degrade to no-cache rather than crash.
        this.logger.warn(`Redis error (cache will be bypassed): ${err.message}`)
      })
    }
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => undefined)
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.client || this.disabled) return false
    if (this.client.status === 'ready') return true
    try {
      await this.client.connect()
      return true
    } catch (err: any) {
      this.logger.warn(`Cache unavailable: ${err.message}`)
      return false
    }
  }

  /**
   * Stable hash of any JSON-serializable input. Used to build cache keys.
   */
  static hashInput(input: unknown): string {
    const serialized = JSON.stringify(input, Object.keys(input as any).sort())
    return createHash('sha256').update(serialized).digest('hex').slice(0, 24)
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!(await this.ensureConnected()) || !this.client) return null
    try {
      const raw = await this.client.get(key)
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch (err: any) {
      this.logger.warn(`Cache get failed for ${key}: ${err.message}`)
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!(await this.ensureConnected()) || !this.client) return
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch (err: any) {
      this.logger.warn(`Cache set failed for ${key}: ${err.message}`)
    }
  }

  async invalidate(pattern: string): Promise<number> {
    if (!(await this.ensureConnected()) || !this.client) return 0
    try {
      const keys = await this.client.keys(pattern)
      if (keys.length === 0) return 0
      return this.client.del(...keys)
    } catch (err: any) {
      this.logger.warn(`Cache invalidate failed for ${pattern}: ${err.message}`)
      return 0
    }
  }

  /**
   * Get-or-set helper: returns cached value if present, else runs factory
   * and stores result.
   */
  async wrap<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached
    const fresh = await factory()
    await this.set(key, fresh, ttlSeconds)
    return fresh
  }
}
