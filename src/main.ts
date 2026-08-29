import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
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

  await app.listen(process.env.PORT ?? 3001);
}

await bootstrap();