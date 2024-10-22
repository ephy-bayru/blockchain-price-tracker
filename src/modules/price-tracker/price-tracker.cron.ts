import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/common/services/logger.service';
import { MoralisConfigType } from 'src/config/moralis.config';
import { PriceTrackerService } from './services/price-tracker.service';

interface TrackedToken {
  address: string;
  chain: string;
}

@Injectable()
export class PriceTrackerCron implements OnModuleInit {
  private readonly trackedTokens: TrackedToken[];
  private initialized = false;
  private readonly context = 'PriceTrackerCron';

  constructor(
    private readonly priceTrackerService: PriceTrackerService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.trackedTokens = this.loadTrackedTokens();
  }

  private loadTrackedTokens(): TrackedToken[] {
    const config = this.configService.get<MoralisConfigType>('moralis');
    if (!config) {
      throw new Error('Moralis configuration not found');
    }

    const tokens: TrackedToken[] = [];

    // Add tokens from tracked tokens config
    Object.entries(config.trackedTokens).forEach(([chain, addresses]) => {
      addresses.forEach((address) => {
        tokens.push({ chain, address });
      });
    });

    // Add native tokens
    Object.entries(config.nativeTokens).forEach(([chain, address]) => {
      tokens.push({ chain, address });
    });

    if (!tokens.length) {
      throw new Error('No tokens configured for tracking');
    }

    return tokens;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.initializeTracking();
      this.initialized = true;
      this.logInitializationSuccess();
    } catch (error) {
      this.logInitializationError(error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async trackPrices(): Promise<void> {
    if (!this.initialized) {
      this.logger.warn(
        'Skipping price tracking - not initialized',
        this.context,
      );
      return;
    }

    const tokensByChain = this.groupTokensByChain();
    await this.trackPricesForAllChains(tokensByChain);
  }

  private groupTokensByChain(): Map<string, string[]> {
    return this.trackedTokens.reduce((chains, token) => {
      if (!chains.has(token.chain)) {
        chains.set(token.chain, []);
      }
      chains.get(token.chain).push(token.address);
      return chains;
    }, new Map<string, string[]>());
  }

  private async initializeTracking(): Promise<void> {
    this.logger.debug('Initializing price tracking...', this.context, {
      tokens: this.trackedTokens.map((t) => ({
        chain: t.chain,
        address: t.address,
      })),
    });

    const tokensByChain = this.groupTokensByChain();
    await this.trackPricesForAllChains(tokensByChain);
  }

  private async trackPricesForAllChains(
    tokensByChain: Map<string, string[]>,
  ): Promise<void> {
    for (const [chain, addresses] of tokensByChain.entries()) {
      try {
        await this.priceTrackerService.trackPrices(addresses, chain);
        this.logTrackingSuccess(chain, addresses.length);
      } catch (error) {
        this.logTrackingError(chain, addresses, error);
      }
    }
  }

  private logInitializationSuccess(): void {
    this.logger.info('Price tracking initialized', this.context, {
      tokenCount: this.trackedTokens.length,
      chains: [...new Set(this.trackedTokens.map((t) => t.chain))],
    });
  }

  private logInitializationError(error: Error): void {
    this.logger.error('Failed to initialize price tracking', this.context, {
      error: error.message,
      stack: error.stack,
    });
  }

  private logTrackingSuccess(chain: string, tokenCount: number): void {
    this.logger.debug('Prices tracked successfully', this.context, {
      chain,
      tokenCount,
    });
  }

  private logTrackingError(
    chain: string,
    addresses: string[],
    error: Error,
  ): void {
    this.logger.error('Failed to track prices', this.context, {
      error: error.message,
      chain,
      addresses,
    });
  }
}
