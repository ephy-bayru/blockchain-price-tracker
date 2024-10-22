// helpers/moralis-initializer.helper.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@/common/services/logger.service';
import Moralis from 'moralis';
import { MoralisConfigType } from '@/config/moralis.config';

@Injectable()
export class MoralisInitializerHelper {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async initialize(): Promise<void> {
    try {
      this.logger.debug('Initializing Moralis SDK...', 'MoralisInitializer');

      const config = this.configService.get<MoralisConfigType>('moralis');
      if (!config.apiKey) {
        throw new Error('MORALIS_API_KEY is not configured');
      }

      await Moralis.start({
        apiKey: config.apiKey,
      });

      this.logger.info(
        'Moralis SDK initialized successfully',
        'MoralisInitializer',
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize Moralis SDK',
        'MoralisInitializer',
        {
          error: this.formatError(error),
        },
      );
      throw new Error('Moralis initialization failed');
    }
  }

  private formatError(error: any): object {
    return {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
}
