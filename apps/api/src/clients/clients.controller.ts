import { Controller, Get } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Controller('clients')
export class ClientsController {
  constructor(private prisma: PrismaClient) {}

  @Get()
  findAll() {
    return this.prisma.client.findMany({ orderBy: { name: 'asc' } })
  }
}
