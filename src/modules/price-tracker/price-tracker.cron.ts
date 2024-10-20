import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/common/services/logger.service';
import { PriceTrackerService } from './services/price-tracker.service';

@Injectable()
export class PriceTrackerCron implements OnModuleInit {
  private readonly trackedTokens: { [chain: string]: string[] };
  private readonly nativeTokens: { [chain: string]: string };
  private readonly supportedChains = ['ethereum', 'polygon'];

  constructor(
    private readonly priceTrackerService: PriceTrackerService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.trackedTokens = this.parseJsonConfig('TRACKED_TOKENS');
    this.nativeTokens = {
      ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH contract address
      polygon: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC contract address
    };
    this.validateConfiguration();
    this.logConfiguration();
  }

  private parseJsonConfig(key: string): any {
    const configValue = this.configService.get<string>(key);
    try {
      const parsedValue = JSON.parse(configValue);
      this.logger.debug(
        `Successfully parsed ${key} configuration`,
        'PriceTrackerCron',
        { parsedValue },
      );
      return parsedValue;
    } catch (error) {
      this.logger.error(
        `Failed to parse ${key} configuration`,
        'PriceTrackerCron',
        { error: error.message, rawValue: configValue },
      );
      return {};
    }
  }

  async onModuleInit() {
    this.logger.info('Initializing PriceTrackerCron', 'PriceTrackerCron');
    await this.initializeTokens();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    this.logger.info('Starting price tracking cron job', 'PriceTrackerCron');
    const startTime = Date.now();
    await this.trackAllChainPrices();
    const duration = Date.now() - startTime;
    this.logger.info('Price tracking cron job completed', 'PriceTrackerCron', {
      durationMs: duration,
    });
  }

  private validateConfiguration() {
    for (const chain of Object.keys(this.trackedTokens)) {
      if (!this.supportedChains.includes(chain)) {
        this.logger.warn(
          `Unsupported chain in tracked tokens: ${chain}`,
          'PriceTrackerCron',
          { supportedChains: this.supportedChains },
        );
        delete this.trackedTokens[chain];
      }
    }
    this.logger.info('Configuration validated', 'PriceTrackerCron', {
      validatedChains: Object.keys(this.trackedTokens),
    });
  }

  private logConfiguration() {
    this.logger.debug('PriceTrackerCron configuration', 'PriceTrackerCron', {
      trackedTokens: this.trackedTokens,
      nativeTokens: this.nativeTokens,
      supportedChains: this.supportedChains,
    });
  }

  private async initializeTokens() {
    this.logger.info('Starting token initialization', 'PriceTrackerCron');
    for (const chain of this.supportedChains) {
      await this.initializeChainTokens(chain);
    }
    this.logger.info('Token initialization completed', 'PriceTrackerCron');
  }

  private async initializeChainTokens(chain: string) {
    const allTokens = this.getAllTokensForChain(chain);
    this.logger.debug(
      `Initializing tokens for chain: ${chain}`,
      'PriceTrackerCron',
      { tokenCount: allTokens.length },
    );
    const initializationPromises = allTokens.map((tokenAddress) =>
      this.ensureTokenExists(tokenAddress, chain),
    );
    const results = await Promise.allSettled(initializationPromises);
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    this.logger.info(
      `Token initialization results for ${chain}`,
      'PriceTrackerCron',
      { succeeded, failed },
    );
  }

  private async ensureTokenExists(tokenAddress: string, chain: string) {
    try {
      const price = await this.priceTrackerService.getLatestPrice(
        tokenAddress,
        chain,
      );
      if (!price) {
        this.logger.debug(
          `Token not found, creating new token`,
          'PriceTrackerCron',
          { tokenAddress, chain },
        );
        await this.priceTrackerService.createToken(tokenAddress, chain);
        this.logger.info(`Created new token`, 'PriceTrackerCron', {
          tokenAddress,
          chain,
        });
      } else {
        this.logger.debug(`Token already exists`, 'PriceTrackerCron', {
          tokenAddress,
          chain,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to ensure token exists`, 'PriceTrackerCron', {
        tokenAddress,
        chain,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  private async trackAllChainPrices() {
    for (const chain of this.supportedChains) {
      await this.trackChainPrices(chain);
    }
  }

  private async trackChainPrices(chain: string) {
    const allTokens = this.getAllTokensForChain(chain);
    this.logger.debug(`Tracking prices for ${chain}`, 'PriceTrackerCron', {
      tokens: allTokens,
    });
    try {
      const result = await this.priceTrackerService.trackPrices(
        allTokens,
        chain,
      );
      this.logger.info(
        `Completed tracking prices for ${chain}`,
        'PriceTrackerCron',
        {
          chain,
          successCount: result.success,
          failureCount: result.failed,
          totalTokens: allTokens.length,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error tracking prices for ${chain}`,
        'PriceTrackerCron',
        {
          error: error.message,
          stack: error.stack,
        },
      );
    }
  }

  private getAllTokensForChain(chain: string): string[] {
    const tokens = [...(this.trackedTokens[chain] || [])];
    if (this.nativeTokens[chain]) {
      tokens.push(this.nativeTokens[chain]);
    }
    this.logger.debug(`Retrieved tokens for chain`, 'PriceTrackerCron', {
      chain,
      tokenCount: tokens.length,
    });
    return tokens;
  }
}
