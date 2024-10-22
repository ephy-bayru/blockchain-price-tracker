import {
  Injectable,
  Inject,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { retry, catchError } from 'rxjs/operators';

import { PriceRepository } from '../repositories/price.repository';
import { MoralisService } from 'src/shared/services/moralis.service';
import { Token } from '../entities/token.entity';
import { Price } from '../entities/price.entity';
import { LoggerService } from 'src/common/services/logger.service';
import {
  PaginationOptions,
  PaginationResult,
} from 'src/common/interfaces/IPagination';
import { TokenPrice, TokenPriceRequest } from 'src/shared/interfaces/IToken';

@Injectable()
export class PriceTrackerService implements OnModuleInit {
  private readonly significantChangeThreshold: number;
  private readonly cacheDuration: number;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1 second

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly priceRepository: PriceRepository,
    private readonly moralisService: MoralisService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {
    this.significantChangeThreshold = this.configService.get<number>(
      'SIGNIFICANT_CHANGE_THRESHOLD',
      3,
    );
    this.cacheDuration = this.configService.get<number>(
      'PRICE_CACHE_DURATION',
      300_000,
    );
    this.logServiceInitialization();
  }

  async onModuleInit() {
    await this.testMoralisConnection();
  }
  private logServiceInitialization() {
    this.logger.info('PriceTrackerService initialized', 'PriceTrackerService', {
      significantChangeThreshold: this.significantChangeThreshold,
      cacheDuration: this.cacheDuration,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    });
  }

  async trackPrices(
    tokenAddresses: string[],
    chain: string,
  ): Promise<{ success: number; failed: number }> {
    this.logger.debug(`Tracking prices for ${chain}`, 'PriceTrackerService', {
      tokenAddresses,
    });
    try {
      const prices = await this.fetchPricesFromMoralis(chain, tokenAddresses);
      const result = await this.processAndSavePrices(prices, chain);
      this.logger.info(
        `Tracked prices for tokens on ${chain}`,
        'PriceTrackerService',
        { tokenCount: tokenAddresses.length, ...result },
      );
      return result;
    } catch (error) {
      this.handleTrackingError(error, chain);
      return { success: 0, failed: tokenAddresses.length };
    }
  }

  private async fetchPricesFromMoralis(
    chain: string,
    tokenAddresses: string[],
  ): Promise<TokenPrice[]> {
    try {
      const tokens: TokenPriceRequest[] = tokenAddresses.map((address) => ({
        address,
      }));
      return await firstValueFrom(
        this.moralisService.getMultipleTokenPrices(chain, tokens).pipe(
          retry({
            count: this.maxRetries,
            delay: this.retryDelay,
          }),
          catchError((error) => {
            this.logger.error(
              'Failed to fetch prices from Moralis after retries',
              'PriceTrackerService',
              {
                chain,
                tokenAddresses,
                error: error.message,
                stack: error.stack,
              },
            );
            throw error;
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        'Failed to fetch prices from Moralis',
        'PriceTrackerService',
        {
          chain,
          tokenAddresses,
          error: error.message,
          stack: error.stack,
        },
      );
      throw error;
    }
  }

  private async processAndSavePrices(
    prices: TokenPrice[],
    chain: string,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    try {
      await this.dataSource.transaction(async (transactionManager) => {
        const priceUpdatePromises = prices.map(async (tokenPrice) => {
          try {
            const price = await this.processTokenPrice(
              tokenPrice,
              chain,
              transactionManager,
            );
            await this.updateCache(price);
            await this.checkPriceAlerts(price);
            success++;
            return price;
          } catch (error) {
            failed++;
            this.logger.error(
              'Failed to process and save price for token',
              'PriceTrackerService',
              {
                tokenAddress: tokenPrice.tokenAddress,
                chain,
                error: error.message,
                stack: error.stack,
              },
            );
            return null;
          }
        });

        await Promise.all(priceUpdatePromises);
      });
    } catch (error) {
      this.logger.error(
        'Failed to process and save prices',
        'PriceTrackerService',
        {
          chain,
          error: error.message,
          stack: error.stack,
        },
      );
    }
    return { success, failed };
  }

  private handleTrackingError(error: Error, chain: string): void {
    this.logger.error(
      `Error tracking prices on ${chain}`,
      'PriceTrackerService',
      { error: error.message, stack: error.stack },
    );
  }

  private async processTokenPrice(
    tokenPrice: TokenPrice,
    chain: string,
    transactionManager: EntityManager,
  ): Promise<Price> {
    try {
      const token = await this.getOrCreateToken(
        tokenPrice.tokenAddress,
        chain,
        transactionManager,
      );

      const price = this.createPriceEntity(token, tokenPrice);

      const savedPrice = await transactionManager.save(Price, price);

      this.logger.debug(`Saved price for token`, 'PriceTrackerService', {
        symbol: token.symbol,
        price: tokenPrice.usdPrice,
      });

      return savedPrice;
    } catch (error) {
      this.logger.error(
        'Failed to process token price',
        'PriceTrackerService',
        {
          tokenAddress: tokenPrice.tokenAddress,
          chain,
          error: error.message,
          stack: error.stack,
        },
      );
      throw error;
    }
  }

  private async getOrCreateToken(
    address: string,
    chain: string,
    transactionManager: EntityManager,
  ): Promise<Token> {
    try {
      let token = await transactionManager.findOne(Token, {
        where: { address, chain },
      });
      if (!token) {
        token = await this.createNewToken(address, chain, transactionManager);
        this.logger.info(`Created new token`, 'PriceTrackerService', {
          symbol: token.symbol,
          address: token.address,
          chain,
        });
      }
      return token;
    } catch (error) {
      this.logger.error(
        'Failed to get or create token',
        'PriceTrackerService',
        {
          address,
          chain,
          error: error.message,
          stack: error.stack,
        },
      );
      throw error;
    }
  }

  private async createNewToken(
    address: string,
    chain: string,
    transactionManager: EntityManager,
  ): Promise<Token> {
    try {
      // Fetching the token metadata, which returns an array
      const [tokenDetails] = await firstValueFrom(
        this.moralisService.getTokenMetadata(chain, [address]).pipe(
          retry({
            count: this.maxRetries,
            delay: this.retryDelay,
          }),
          catchError((error) => {
            this.logger.error(
              'Failed to fetch token metadata from Moralis after retries',
              'PriceTrackerService',
              {
                address,
                chain,
                error: error.message,
                stack: error.stack,
              },
            );
            throw error;
          }),
        ),
      );

      // Ensure tokenDetails exists
      if (!tokenDetails) {
        throw new Error(`Token metadata not found for address: ${address}`);
      }

      // Creating the token entity using the extracted token details
      const token = transactionManager.create(Token, {
        address,
        chain,
        name: tokenDetails.name || 'Unknown',
        symbol: tokenDetails.symbol || 'UNKNOWN',
        decimals: tokenDetails.decimals
          ? parseInt(tokenDetails.decimals, 10)
          : 18,
      });

      return transactionManager.save(Token, token);
    } catch (error) {
      this.logger.error('Failed to create new token', 'PriceTrackerService', {
        address,
        chain,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  private createPriceEntity(token: Token, tokenPrice: TokenPrice): Price {
    const price = new Price();
    price.token = token;
    price.usdPrice = tokenPrice.usdPrice;
    price.timestamp = new Date(parseInt(tokenPrice.blockTimestamp));
    price.percentageChange24h = parseFloat(tokenPrice['24hrPercentChange']);

    if (tokenPrice['1hrPercentChange']) {
      price.percentageChange1h = parseFloat(tokenPrice['1hrPercentChange']);
    }

    return price;
  }

  private async updateCache(price: Price): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(price.token.chain, price.token.address);
      await this.cacheManager.set(cacheKey, price, this.cacheDuration);
      this.logger.debug(`Updated cache for token`, 'PriceTrackerService', {
        symbol: price.token.symbol,
        address: price.token.address,
      });
    } catch (error) {
      this.logger.error('Failed to update cache', 'PriceTrackerService', {
        tokenAddress: price.token.address,
        chain: price.token.chain,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  private async checkPriceAlerts(newPrice: Price): Promise<void> {
    const percentageChange = newPrice.percentageChange1h;
    if (
      percentageChange !== null &&
      Math.abs(percentageChange) >= this.significantChangeThreshold
    ) {
      this.logger.warn(
        `Significant price change detected`,
        'PriceTrackerService',
        {
          symbol: newPrice.token.symbol,
          percentageChange: percentageChange.toFixed(2),
        },
      );
      this.eventEmitter.emit('price.significantChange', { newPrice });
    }
  }

  async getLatestPrice(
    tokenAddress: string,
    chain: string,
  ): Promise<Price | null> {
    try {
      const cachedPrice = await this.getCachedPrice(tokenAddress, chain);
      if (cachedPrice) return cachedPrice;

      const token = await this.findToken(tokenAddress, chain);
      if (!token) return null;

      const price = await this.priceRepository.findLatestPrice(token.id);
      if (price) {
        await this.updateCache(price);
      }
      return price;
    } catch (error) {
      this.logger.error('Failed to get latest price', 'PriceTrackerService', {
        tokenAddress,
        chain,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async getHourlyPrices(
    tokenAddress: string,
    chain: string,
    paginationOptions: PaginationOptions<Price>,
  ): Promise<PaginationResult<Price>> {
    try {
      const token = await this.findTokenOrThrow(tokenAddress, chain);
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      const result = await this.priceRepository.findHourlyPrices(
        token.id,
        startTime,
        endTime,
        paginationOptions,
      );
      this.logger.debug(`Retrieved hourly prices`, 'PriceTrackerService', {
        symbol: token.symbol,
        startTime,
        endTime,
        count: result.data.length,
      });
      return result;
    } catch (error) {
      this.logger.error('Failed to get hourly prices', 'PriceTrackerService', {
        tokenAddress,
        chain,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async createToken(address: string, chain: string): Promise<Token> {
    try {
      // Fetching token metadata, which returns an array
      const [tokenDetails] = await firstValueFrom(
        this.moralisService.getTokenMetadata(chain, [address]),
      );

      // Ensure tokenDetails exists
      if (!tokenDetails) {
        throw new Error(`Token metadata not found for address: ${address}`);
      }

      // Creating the token entity using the extracted token details
      const token = this.tokenRepository.create({
        address,
        chain,
        name: tokenDetails.name || 'Unknown',
        symbol: tokenDetails.symbol || 'UNKNOWN',
        decimals: tokenDetails.decimals
          ? parseInt(tokenDetails.decimals, 10)
          : null,
      });

      return this.tokenRepository.save(token);
    } catch (error) {
      this.logger.error('Failed to create token', 'PriceTrackerService', {
        address,
        chain,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  private getCacheKey(chain: string, tokenAddress: string): string {
    return `price:${chain}:${tokenAddress}`;
  }

  private async getCachedPrice(
    tokenAddress: string,
    chain: string,
  ): Promise<Price | null> {
    try {
      const cacheKey = this.getCacheKey(chain, tokenAddress);
      const cachedPrice = await this.cacheManager.get<Price>(cacheKey);
      if (cachedPrice) {
        this.logger.debug(`Retrieved cached price`, 'PriceTrackerService', {
          tokenAddress,
          chain,
        });
        return cachedPrice;
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get cached price', 'PriceTrackerService', {
        tokenAddress,
        chain,
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  }

  private async findToken(
    tokenAddress: string,
    chain: string,
  ): Promise<Token | null> {
    try {
      return this.tokenRepository.findOne({
        where: { address: tokenAddress, chain },
      });
    } catch (error) {
      this.logger.error('Failed to find token', 'PriceTrackerService', {
        tokenAddress,
        chain,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  private async findTokenOrThrow(
    tokenAddress: string,
    chain: string,
  ): Promise<Token> {
    const token = await this.findToken(tokenAddress, chain);
    if (!token) {
      this.logger.warn(`Token not found`, 'PriceTrackerService', {
        tokenAddress,
        chain,
      });
      throw new NotFoundException(
        `Token not found: ${tokenAddress} on ${chain}`,
      );
    }
    return token;
  }

  async getChainPrices(chain: string): Promise<Record<string, number>> {
    try {
      const tokens = await this.tokenRepository.find({ where: { chain } });
      const addresses = tokens.map((token) => token.address);
      const prices = await this.fetchPricesFromMoralis(chain, addresses);

      return prices.reduce(
        (acc, price) => {
          acc[price.tokenAddress] = price.usdPrice;
          return acc;
        },
        {} as Record<string, number>,
      );
    } catch (error) {
      this.logger.error(`Error fetching chain prices`, 'PriceTrackerService', {
        chain,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async getChainPricesAtTime(
    chain: string,
    time: Date,
  ): Promise<Record<string, number>> {
    try {
      const tokens = await this.tokenRepository.find({ where: { chain } });
      const pricesPromises = tokens.map(async (token) => {
        const price = await this.priceRepository.findPriceAtOrBefore(
          token.id,
          time,
        );
        return [token.address, price ? price.usdPrice : null];
      });
      const pricesArray = await Promise.all(pricesPromises);
      return Object.fromEntries(
        pricesArray.filter(([, price]) => price !== null),
      );
    } catch (error) {
      this.logger.error(
        `Error fetching chain prices at time`,
        'PriceTrackerService',
        { chain, time, error: error.message, stack: error.stack },
      );
      throw error;
    }
  }

  private async testMoralisConnection() {
    try {
      this.logger.info('Testing Moralis API connection', 'PriceTrackerService');
      const result = await firstValueFrom(
        this.moralisService.testApiConnection(),
      );
      this.logger.info(
        'Moralis API connection test successful',
        'PriceTrackerService',
        {
          result: this.truncateResult(result),
        },
      );
    } catch (error) {
      this.logger.error(
        'Moralis API connection test failed',
        'PriceTrackerService',
        {
          error: error.message,
          stack: error.stack,
        },
      );
    }
  }

  private truncateResult(result: any): any {
    if (typeof result === 'object') {
      return Object.keys(result).reduce((acc, key) => {
        acc[key] =
          typeof result[key] === 'string' && result[key].length > 50
            ? result[key].substring(0, 47) + '...'
            : result[key];
        return acc;
      }, {});
    }
    return result;
  }
}
