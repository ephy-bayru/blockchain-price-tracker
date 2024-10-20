import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './core/database/database.module';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './modules/health/health.module';
import { PriceTrackerModule } from './modules/price-tracker/price-tracker.module';

import { LoggingInterceptor } from './common/services/logging.interceptor';
import appConfig from './config/app.config';
import throttlerConfig from './config/throttler.config';
import emailConfig from './config/email.config';
import moralisConfig from './config/moralis.config';
import { AlertsModule } from './modules/alerts/alerts.module';
import { SwapModule } from './modules/swap/swap.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, throttlerConfig, emailConfig, moralisConfig],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        configService.get('throttler'),
      ],
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
    }),
    DatabaseModule,
    CommonModule,
    SharedModule,
    HealthModule,
    PriceTrackerModule,
    AlertsModule,
    SwapModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
