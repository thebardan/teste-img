import { Controller, Get, Query, NotFoundException } from '@nestjs/common'
import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('by-email')
  async findByEmail(@Query('email') email: string) {
    if (!email) throw new NotFoundException('email query param required')
    const user = await this.service.findByEmail(email)
    if (!user) throw new NotFoundException(`User ${email} not found`)
    return { id: user.id, email: user.email, name: user.name, role: user.role }
  }
}
