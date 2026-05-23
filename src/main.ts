import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express'; // Import express wrapper explicitly
import { join } from 'path';        // Import path join utility for disk location matching

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enforce resource sharing rules to communicate cleanly with your frontend
  app.enableCors({
    origin: 'http://localhost:3000', 
    credentials: true,
  });

  // Enable global endpoint paths
  app.setGlobalPrefix('api');
  
  app.useGlobalPipes(new ValidationPipe());

  // ◄ SERVE PHYSICAL DISK UPLOADS AS STATIC LOGS ASSETS OUTSIDE THE GLOBAL /api PREFIX
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Change this value from 3000 to 4000
  await app.listen(4000);
  console.log('NestJS Core Engine Active Node on: http://localhost:4000/api');
  console.log('Static Assets Asset Streamer listening on: http://localhost:4000/uploads');
}
bootstrap();