import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, from, defer, throwError, of } from 'rxjs';
import { retryWhen, delay, mergeMap } from 'rxjs/operators';
import { LoggerService } from 'src/common/services/logger.service';
import { MoralisService } from 'src/shared/services/moralis.service';
import {
  PaginationOptions,
  PaginationResult,
} from '@/common/interfaces/IPagination';
import { PriceRepository } from '../repositories/price.repository';
import { Price } from '../entities/price.entity';

@Injectable()
export class PriceTrackerService {
  private readonly significantChangeThreshold: number;
  private readonly cacheDuration: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    private readonly priceRepository: PriceRepository,
    private readonly moralisService: MoralisService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.significantChangeThreshold = this.configService.get<number>(
      'SIGNIFICANT_CHANGE_THRESHOLD',
      3,
    );
    this.cacheDuration = this.configService.get<number>(
      'CACHE_DURATION',
      5 * 60 * 1000,
    ); // 5 minutes
    this.maxRetries = this.configService.get<number>('MAX_RETRIES', 3);
    this.retryDelay = this.configService.get<number>('RETRY_DELAY', 1000); // 1 second
  }

  private withRetry<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    return firstValueFrom(
      defer(() => from(operation())).pipe(
        retryWhen((errors) =>
          errors.pipe(
            mergeMap((error, index) => {
              if (index >= this.maxRetries) {
                return throwError(() => error);
              }
              this.logger.warn(
                `Retrying operation (${index + 1}/${this.maxRetries})`,
                context,
                { error: error.message },
              );
              return of(error).pipe(
                delay(this.retryDelay * Math.pow(2, index)),
              ); // Exponential backoff
            }),
          ),
        ),
      ),
    );
  }

  private async withCache<T>(
    key: string,
    operation: () => Promise<T>,
    ttl: number = this.cacheDuration,
  ): Promise<T> {
    const cachedValue = await this.cacheManager.get<T>(key);
    if (cachedValue) {
      this.logger.debug('Cache hit', 'PriceTrackerService', { key });
      return cachedValue;
    }

    const value = await operation();
    await this.cacheManager.set(key, value, ttl);
    return value;
  }

  async trackPrices(tokenAddresses: string[], chain: string): Promise<void> {
    try {
      this.logger.debug('Starting price tracking', 'PriceTrackerService', {
        chain,
        tokenCount: tokenAddresses.length,
      });

      for (const address of tokenAddresses) {
        try {
          await this.withRetry(
            () => this.trackTokenPrice(address, chain),
            'trackTokenPrice',
          );
        } catch (error) {
          // Log error but continue with next token
          this.logger.error(
            `Error tracking price for token ${address}`,
            'PriceTrackerService',
            {
              error,
              chain,
              address,
            },
          );
        }
      }

      this.logger.info('Price tracking completed', 'PriceTrackerService', {
        chain,
        tokenCount: tokenAddresses.length,
      });
    } catch (error) {
      this.logger.error(
        'Error in price tracking batch',
        'PriceTrackerService',
        {
          error,
          chain,
          tokenCount: tokenAddresses.length,
        },
      );
      throw error;
    }
  }

  private async trackTokenPrice(address: string, chain: string): Promise<void> {
    const cacheKey = `price:${chain}:${address}`;

    try {
      const tokenId = await this.withRetry(
        () => this.priceRepository.ensureToken(address, chain),
        'ensureToken',
      );

      const price = await this.withCache(
        cacheKey,
        () => firstValueFrom(this.moralisService.getTokenPrice(chain, address)),
        this.cacheDuration,
      );

      // Skip saving if no price data
      if (!price || price.usdPrice === null) {
        this.logger.warn(
          'Skipping price save - No liquidity',
          'PriceTrackerService',
          {
            chain,
            address,
            tokenId,
          },
        );
        return;
      }

      const newPrice = await this.withRetry(
        () =>
          this.priceRepository.savePrice(tokenId, {
            usdPrice: price.usdPrice,
            percentageChange1h: parseFloat(price['1hrPercentChange'] || '0'),
            percentageChange24h: parseFloat(price['24hrPercentChange'] || '0'),
            timestamp: new Date(),
          }),
        'savePrice',
      );

      await this.checkSignificantPriceChange(newPrice);

      // Update metadata in background
      this.updateTokenMetadata(tokenId, address, chain).catch((error) => {
        this.logger.error(
          'Error updating token metadata',
          'PriceTrackerService',
          {
            error,
            context: { tokenId, address, chain },
          },
        );
      });
    } catch (error) {
      this.logger.error('Error tracking token price', 'PriceTrackerService', {
        error,
        context: { address, chain },
      });
      throw error;
    }
  }

  async getLatestPrice(tokenAddress: string, chain: string): Promise<Price> {
    const cacheKey = `latest:${chain}:${tokenAddress}`;

    return this.withCache(cacheKey, async () => {
      const token = await this.withRetry(
        () => this.priceRepository.ensureToken(tokenAddress, chain),
        'getLatestPrice.ensureToken',
      );

      const price = await this.withRetry(
        () => this.priceRepository.findLatestPrice(token),
        'getLatestPrice.findLatestPrice',
      );

      if (!price) {
        throw new Error(`No price data found for token ${tokenAddress}`);
      }

      return price;
    });
  }

  async getHourlyPrices(
    tokenAddress: string,
    chain: string,
    paginationOptions: PaginationOptions<Price>,
  ): Promise<PaginationResult<Price>> {
    const cacheKey = `hourly:${chain}:${tokenAddress}:${paginationOptions.page}:${paginationOptions.limit}`;

    return this.withCache(cacheKey, async () => {
      const token = await this.withRetry(
        () => this.priceRepository.ensureToken(tokenAddress, chain),
        'getHourlyPrices.ensureToken',
      );

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      return this.withRetry(
        () =>
          this.priceRepository.findHourlyPrices(
            token,
            startTime,
            endTime,
            paginationOptions,
          ),
        'getHourlyPrices.findHourlyPrices',
      );
    });
  }

  private async updateTokenMetadata(
    tokenId: string,
    address: string,
    chain: string,
  ): Promise<void> {
    const cacheKey = `metadata:${chain}:${address}`;

    try {
      const metadata = await this.withCache(
        cacheKey,
        () =>
          firstValueFrom(this.moralisService.getTokenMetadata(chain, address)),
        this.cacheDuration * 12, // Cache metadata longer as it changes less frequently
      );

      await this.withRetry(
        () => this.priceRepository.updateTokenMetadata(tokenId, metadata),
        'updateTokenMetadata',
      );
    } catch (error) {
      this.logger.error(
        'Error updating token metadata',
        'PriceTrackerService',
        {
          error,
          context: { tokenId, address, chain },
        },
      );
    }
  }

  private async checkSignificantPriceChange(newPrice: Price): Promise<void> {
    try {
      const oldPrice = await this.withRetry(
        () => this.priceRepository.findPriceOneHourAgo(newPrice.tokenId),
        'findPriceOneHourAgo',
      );

      if (!oldPrice) return;

      const percentageChange =
        ((newPrice.usdPrice - oldPrice.usdPrice) / oldPrice.usdPrice) * 100;

      if (Math.abs(percentageChange) >= this.significantChangeThreshold) {
        this.eventEmitter.emit('price.significantChange', {
          tokenId: newPrice.tokenId,
          oldPrice: oldPrice.usdPrice,
          newPrice: newPrice.usdPrice,
          percentageChange,
        });
      }
    } catch (error) {
      this.logger.error(
        'Error checking significant price change',
        'PriceTrackerService',
        {
          error,
          context: { newPrice },
        },
      );
    }
  }

  async getTrackedTokens(chain: string): Promise<string[]> {
    try {
      const trackedTokens = this.configService.get<string>('TRACKED_TOKENS');
      if (!trackedTokens) {
        this.logger.warn(
          `TRACKED_TOKENS configuration not found`,
          'PriceTrackerService',
        );
        return [];
      }

      const parsedTokens = JSON.parse(trackedTokens);

      if (!parsedTokens[chain]) {
        this.logger.warn(
          `No tracked tokens found for chain: ${chain}`,
          'PriceTrackerService',
        );
        return [];
      }

      return parsedTokens[chain];
    } catch (error) {
      this.logger.error(
        `Error fetching tracked tokens for chain: ${chain}`,
        'PriceTrackerService',
        { error },
      );
      return [];
    }
  }

  async getPriceAtTime(
    tokenAddress: string,
    chain: string,
    time: Date,
  ): Promise<Price | null> {
    try {
      // Ensure the token exists and retrieve its ID
      const tokenId = await this.withRetry(
        () => this.priceRepository.ensureToken(tokenAddress, chain),
        'getPriceAtTime.ensureToken',
      );

      // Fetch the price at the specified time
      const priceAtTime = await this.withRetry(
        () => this.priceRepository.findPriceAtTime(tokenId, time),
        'getPriceAtTime.findPriceAtTime',
      );

      if (!priceAtTime) {
        this.logger.warn(
          'No price data found for token at specified time',
          'PriceTrackerService',
          { tokenAddress, chain, tokenId, time },
        );
      }

      return priceAtTime;
    } catch (error) {
      this.logger.error(
        'Error fetching price at specified time',
        'PriceTrackerService',
        { error, tokenAddress, chain, time },
      );
      throw error;
    }
  }
}
