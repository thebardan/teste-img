import { Injectable, UnauthorizedException } from '@nestjs/common'
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
   * Resolve caller to a DB User.
   * - If email provided and user exists → return that user.
   * - If email provided but user missing → upsert as VIEWER (first login auto-provision).
   * - If no email:
   *   - production → throw UnauthorizedException
   *   - dev/test → fallback to system user (keeps local workflows frictionless)
   */
  async resolveCaller(email?: string | null): Promise<User> {
    if (email) {
      const found = await this.prisma.user.findUnique({ where: { email } })
      if (found) return found
      // Auto-provision first-login user with minimal name
      return this.prisma.user.upsert({
        where: { email },
        create: { email, name: email.split('@')[0] },
        update: {},
      })
    }
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Caller identity missing (X-User-Email header)')
    }
    return this.getSystemUser()
  }
}
