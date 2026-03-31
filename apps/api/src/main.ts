import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import type { Env } from './config/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService<Env>)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.enableCors({ origin: config.get('NEXTAUTH_URL') ?? 'http://localhost:3000' })
  const port = config.get<number>('PORT') ?? 4000
  await app.listen(port)
  console.log(`API running on http://localhost:${port}/api`)
}
bootstrap()
