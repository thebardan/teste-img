import { Global, Module, OnApplicationShutdown } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

const prismaProvider = {
  provide: PrismaClient,
  useFactory: async () => {
    const prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    })
    await prisma.$connect()
    return prisma
  },
}

@Global()
@Module({
  providers: [prismaProvider],
  exports: [PrismaClient],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(private prisma: PrismaClient) {}

  async onApplicationShutdown() {
    await this.prisma.$disconnect()
  }
}
