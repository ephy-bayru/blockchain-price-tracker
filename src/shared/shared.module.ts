// shared.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MoralisService } from './services/moralis.service';
import { RateLimitHelper } from './helpers/rate-limit.helper';
import { ErrorHandlingHelper } from './helpers/error-handling.helper';
import { ChainUtilsHelper } from './helpers/chain-utils.helper';
import { RetryHelper } from './helpers/retry.helper';
import { ResponseMapperHelper } from './helpers/response-mapper.helper';
import { GeneralUtilsHelper } from './helpers/general-utils.helper';
import { MoralisInitializerHelper } from './helpers/moralis-initializer.helper';
import { EmailService } from './services/email.service';
import moralisConfig, { MoralisConfigType } from '../config/moralis.config';

const HELPERS = [
  RateLimitHelper,
  ErrorHandlingHelper,
  ChainUtilsHelper,
  RetryHelper,
  ResponseMapperHelper,
  GeneralUtilsHelper,
  MoralisInitializerHelper,
];

@Module({
  imports: [HttpModule, ConfigModule.forFeature(moralisConfig)],
  providers: [
    ...HELPERS,
    {
      provide: 'RATE_LIMIT_CONFIG',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<MoralisConfigType>('moralis');
        return config.api.rateLimitConfig;
      },
    },
    {
      provide: 'RETRY_CONFIG',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<MoralisConfigType>('moralis');
        return config.api.retryConfig;
      },
    },
    MoralisService,
    EmailService,
  ],
  exports: [MoralisService, EmailService],
})
export class SharedModule {}
