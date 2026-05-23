import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable global endpoint paths
  app.setGlobalPrefix('api');
  
  // Enforce resource sharing rules to communicate cleanly with your frontend
  app.enableCors({
    origin: 'http://localhost:3000', 
    credentials: true,
  });

  // ◄ CHANGE THIS VALUE FROM 3000 TO 4000
  await app.listen(4000);
  console.log('NestJS Core Engine Active Node on: http://localhost:4000/api');
}
bootstrap();
