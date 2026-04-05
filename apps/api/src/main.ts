import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import type { Env } from './config/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  const config = app.get(ConfigService<Env>)

  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new LoggingInterceptor())
  app.enableCors({
    origin: config.get('NEXTAUTH_URL') ?? 'http://localhost:3000',
    credentials: true,
  })

  const port = config.get<number>('PORT') ?? 4000
  await app.listen(port)
  console.log(`API running on http://localhost:${port}/api`)
}
bootstrap()
