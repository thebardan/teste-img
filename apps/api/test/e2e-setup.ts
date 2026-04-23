import { INestApplication, ValidationPipe, Module, Type } from '@nestjs/common'
import { Test, TestingModuleBuilder } from '@nestjs/testing'
import { PrismaClient } from '@prisma/client'
import { APP_GUARD } from '@nestjs/core'
import { Reflector } from '@nestjs/core'

// ─── Mock factories ──────────────────────────────────────────────────────────

export interface PrismaMock {
  user: any
  product: any
  client: any
  template: any
  salesSheet: any
  salesSheetVersion: any
  presentation: any
  presentationVersion: any
  presentationSlide: any
  approval: any
  auditLog: any
  notification: any
  tonePreset: any
  channelCtaPreset: any
  brandAsset: any
  brandRule: any
  promptTemplate: any
  inferenceLog: any
  exportedArtifact: any
  generationJob: any
  driveFolder: any
  driveImage: any
  $transaction: jest.Mock
}

export function makePrismaMock(): PrismaMock {
  const model = () => ({
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  })

  return {
    user: model(),
    product: model(),
    client: model(),
    template: model(),
    salesSheet: model(),
    salesSheetVersion: model(),
    presentation: model(),
    presentationVersion: model(),
    presentationSlide: model(),
    approval: model(),
    auditLog: model(),
    notification: model(),
    tonePreset: model(),
    channelCtaPreset: model(),
    brandAsset: model(),
    brandRule: model(),
    promptTemplate: model(),
    inferenceLog: model(),
    exportedArtifact: model(),
    generationJob: model(),
    driveFolder: model(),
    driveImage: model(),
    $transaction: jest.fn((ops: any) => {
      if (Array.isArray(ops)) return Promise.all(ops)
      if (typeof ops === 'function') return Promise.resolve(ops({}))
      return Promise.resolve(ops)
    }),
  }
}

export const SYSTEM_USER = {
  id: 'sys-user',
  email: 'admin@multilaser.com.br',
  name: 'System',
  role: 'ADMIN' as const,
}

export const TEST_EDITOR = {
  id: 'editor-1',
  email: 'editor@multilaser.com.br',
  name: 'Editor',
  role: 'EDITOR' as const,
}

export const TEST_APPROVER = {
  id: 'approver-1',
  email: 'approver@multilaser.com.br',
  name: 'Approver',
  role: 'APPROVER' as const,
}

export function stubUserResolution(prisma: PrismaMock, users: any[]) {
  const map = new Map<string, any>()
  for (const u of users) map.set(u.email, u)
  prisma.user.findUnique.mockImplementation(({ where }: any) => {
    if (where.email) return Promise.resolve(map.get(where.email) ?? null)
    return Promise.resolve(users.find((u) => u.id === where.id) ?? null)
  })
  prisma.user.findFirst.mockImplementation(({ where }: any) =>
    Promise.resolve(map.get(where?.email) ?? null),
  )
  prisma.user.upsert.mockImplementation(({ where, create }: any) => {
    const existing = map.get(where.email)
    if (existing) return Promise.resolve(existing)
    const fresh = { id: `auto-${where.email}`, email: where.email, name: create?.name ?? where.email, role: 'VIEWER' }
    return Promise.resolve(fresh)
  })
}

// ─── Test bootstrapper ───────────────────────────────────────────────────────

export interface BootstrapOptions {
  controllers: Type<any>[]
  providers: any[]
  imports?: any[]
  prisma?: PrismaMock
}

export interface E2EContext {
  app: INestApplication
  prisma: PrismaMock
  module: any
}

/**
 * Build minimal NestJS app with only the given controllers + providers.
 * Bypasses AppModule entirely to avoid BullMQ/Redis/MinIO bootstrap.
 */
export async function bootstrap(opts: BootstrapOptions): Promise<E2EContext> {
  const prisma = opts.prisma ?? makePrismaMock()

  @Module({
    imports: opts.imports ?? [],
    controllers: opts.controllers,
    providers: [
      { provide: PrismaClient, useValue: prisma },
      ...opts.providers,
      Reflector,
    ],
  })
  class E2ETestModule {}

  const builder: TestingModuleBuilder = Test.createTestingModule({
    imports: [E2ETestModule],
  })

  const mod = await builder.compile()
  const app = mod.createNestApplication({ logger: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.init()

  return { app, prisma, module: mod }
}

export async function close(ctx: E2EContext) {
  await ctx.app.close()
}
