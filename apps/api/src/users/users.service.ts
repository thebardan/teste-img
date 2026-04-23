import { Injectable } from '@nestjs/common'
import { PrismaClient, User } from '@prisma/client'

const SYSTEM_USER_EMAIL = 'admin@multilaser.com.br'

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

  async getSystemUser(): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { email: SYSTEM_USER_EMAIL } })
    if (!user) throw new Error('System user not found — run seed first')
    return user
  }

  /**
   * Resolve caller to a DB User. Falls back to system user if no email header.
   * Used by services that need to attribute actions to the real caller.
   */
  async resolveCaller(email?: string | null): Promise<User> {
    if (email) {
      const user = await this.prisma.user.findUnique({ where: { email } })
      if (user) return user
    }
    return this.getSystemUser()
  }
}
