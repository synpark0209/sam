import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // 텔레그램 미니앱, Vercel 배포, localhost 모두 허용
      if (!origin
        || allowedOrigins.includes(origin)
        || origin.includes('vercel.app')
        || origin.includes('telegram')
        || origin.includes('localhost')
      ) {
        callback(null, true);
      } else {
        callback(null, true); // 개발 중에는 모두 허용 (프로덕션에서 제한 필요)
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
