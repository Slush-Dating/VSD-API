import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SocketAdapter } from './chats/socket.adapter';
import { BaseExceptionFilter } from './common/filters/base-exception.filter';
import * as admin from 'firebase-admin';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  /**
   * Config
   */
  app.useStaticAssets(join(__dirname, '../', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');
  app.useGlobalFilters(new BaseExceptionFilter(configService));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
  });
  app.enableCors();
  app.useWebSocketAdapter(new SocketAdapter(app));

  /**
   * Swagger
   */
  const serverUrl = configService.get('APP_URL');
  const appName = configService.get('APP_NAME');
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(appName)
      .setDescription(`The ${appName} API documentation`)
      .setVersion('1.0')
      .addServer(serverUrl, 'REST APIs')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api/documentation', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: `${appName} - Swagger Documentation`,
  });

  // Initialize the firebase admin app
  admin.initializeApp({
    credential: admin.credential.cert(
      configService.get<string>('FIREBASE_SERVICE_ACCOUNT_KEY'),
    ),
  });

  const port = +configService.get<number>('PORT', 3000);
  await app.listen(port, () => console.log(`Listening on port ${port}`));
}
bootstrap();
