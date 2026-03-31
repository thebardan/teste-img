import { Global, Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

const prismaProvider = {
  provide: PrismaClient,
  useFactory: () => {
    const prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    })
    return prisma
  },
}

@Global()
@Module({
  providers: [prismaProvider],
  exports: [PrismaClient],
})
export class DatabaseModule {}
