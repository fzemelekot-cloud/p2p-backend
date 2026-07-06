import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // 1. Import ValidationPipe

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 2. Turn on global data cleansing & structural enforcement
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,       // Strips out any random fields malicious users try to inject
    transform: true,       // Automatically transforms network payloads into real typed objects
  }));

  await app.listen(3000);
  console.log(`🚀 Application successfully running on: http://localhost:3000`);
}
bootstrap();