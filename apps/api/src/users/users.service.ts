import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async upsert(email: string, name: string) {
    return this.prisma.user.upsert({
      where: { email },
      create: { email, name },
      update: { name },
    })
  }
}
