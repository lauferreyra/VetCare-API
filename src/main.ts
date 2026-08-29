import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,  //elimina propiedades que no estén en el DTO
      forbidNonWhitelisted: true, //en lugar de ignorarlas, devuelve error
      transform: true, //transforma el request al tipo del DTO
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://vetcare-demo-mu.vercel.app',
    ],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('VetCare API')
    .setDescription(
      'REST API for VetCare - users, pets and appointments',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );

  SwaggerModule.setup(
    'api/docs',
    app,
    document,
  );

  await app.listen(process.env.PORT ?? 3001);
}

await bootstrap();