import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './common/services/logger.service';
import { SwaggerModule } from '@nestjs/swagger';
import {
  swaggerConfig,
  swaggerCustomOptions,
  applySwaggerGlobalApiResponses,
} from './config/swagger.config';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { INestApplication, VersioningType } from '@nestjs/common';

async function configureApp(
  app: INestApplication,
  configService: ConfigService,
  logger: LoggerService,
): Promise<void> {
  app.useGlobalFilters(new GlobalExceptionFilter(logger, configService));
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableCors();

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get<string>('API_DEFAULT_VERSION', '1'),
    prefix: 'v',
  });

  // Swagger setup
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const documentWithGlobalResponses = applySwaggerGlobalApiResponses(document);
  SwaggerModule.setup(
    'api/docs',
    app,
    documentWithGlobalResponses,
    swaggerCustomOptions,
  );

  logger.log('App configuration completed.', 'ConfigureApp');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  app.useLogger(logger);
  app.enableShutdownHooks();

  await configureApp(app, configService, logger);

  const port = configService.get<number>('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0');
  await app.listen(port, host);

  logger.log(`Application is running on: ${await app.getUrl()}`, 'Bootstrap');
}

async function startApp() {
  try {
    await bootstrap();
  } catch (error) {
    console.error('Application failed to start:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startApp();
}

export { startApp, bootstrap, configureApp };
