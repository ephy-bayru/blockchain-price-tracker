import {
  Controller,
  Get,
  Query,
  Param,
  UseInterceptors,
  ValidationPipe,
  ParseEnumPipe,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { PriceTrackerService } from '../services/price-tracker.service';
import {
  GetHourlyPricesDto,
  PriceResponseDto,
  PaginatedPriceResponseDto,
} from '../dtos/price-tracker.dto';
import { ChainEnum } from '../enums/chain.enum';
import {
  PriceTrackerControllerDocs,
  GetLatestPriceDocs,
  GetHourlyPricesDocs,
} from '../documentation/price-tracker.documentation';
import { mapPriceToResponseDto } from '../mappers/price.mapper';
import { LoggerService } from 'src/common/services/logger.service';

@PriceTrackerControllerDocs()
@Controller({ path: 'price-tracker', version: '1' })
@UseInterceptors(CacheInterceptor)
export class PriceTrackerController {
  private readonly CACHE_TTL_LATEST = 60; // 1 minute
  private readonly CACHE_TTL_HOURLY = 300; // 5 minutes

  constructor(
    private readonly priceTrackerService: PriceTrackerService,
    private readonly logger: LoggerService,
  ) {}

  @Get('latest/:chain/:tokenAddress')
  @CacheKey('latest_price')
  @CacheTTL(60)
  @GetLatestPriceDocs()
  async getLatestPrice(
    @Param('chain', new ParseEnumPipe(ChainEnum)) chain: ChainEnum,
    @Param('tokenAddress') tokenAddress: string,
  ): Promise<PriceResponseDto> {
    this.logger.debug('Fetching latest price', 'PriceTrackerController', {
      chain,
      tokenAddress: this.truncateAddress(tokenAddress),
    });

    try {
      const price = await this.priceTrackerService.getLatestPrice(
        tokenAddress,
        chain,
      );

      if (!price?.usdPrice) {
        this.logger.warn(
          'No price data or liquidity found',
          'PriceTrackerController',
          {
            chain,
            tokenAddress: this.truncateAddress(tokenAddress),
          },
        );
        throw new NotFoundException(
          `No price data or liquidity found for token ${tokenAddress} on ${chain}`,
        );
      }

      const response = mapPriceToResponseDto(price);

      this.logger.debug(
        'Latest price fetched successfully',
        'PriceTrackerController',
        {
          chain,
          tokenAddress: this.truncateAddress(tokenAddress),
          timestamp: response.timestamp,
          price: response.usdPrice,
        },
      );

      return response;
    } catch (error) {
      return this.handleError(error, 'getLatestPrice', {
        chain,
        tokenAddress,
      });
    }
  }

  @Get('hourly-prices')
  @CacheKey('hourly_prices')
  @CacheTTL(300)
  @GetHourlyPricesDocs()
  async getHourlyPrices(
    @Query(new ValidationPipe({ transform: true, forbidNonWhitelisted: true }))
    query: GetHourlyPricesDto,
  ): Promise<PaginatedPriceResponseDto> {
    const { tokenAddress, chain, page, limit } = query;

    this.logger.debug('Fetching hourly prices', 'PriceTrackerController', {
      tokenAddress: this.truncateAddress(tokenAddress),
      chain,
      page,
      limit,
    });

    try {
      const result = await this.priceTrackerService.getHourlyPrices(
        tokenAddress,
        chain,
        { page, limit },
      );

      // Filter out null prices
      const validPrices = result.data.filter(
        (price) => price?.usdPrice != null,
      );

      if (validPrices.length === 0) {
        this.logger.warn(
          'No valid price data found',
          'PriceTrackerController',
          {
            tokenAddress: this.truncateAddress(tokenAddress),
            chain,
          },
        );
        throw new NotFoundException(
          `No valid price data found for token ${tokenAddress} on ${chain}`,
        );
      }

      const response = {
        data: validPrices.map(mapPriceToResponseDto),
        total: validPrices.length,
        page: result.page,
        limit: result.limit,
      };

      this.logger.debug(
        'Hourly prices fetched successfully',
        'PriceTrackerController',
        {
          tokenAddress: this.truncateAddress(tokenAddress),
          chain,
          recordCount: response.data.length,
          total: response.total,
        },
      );

      return response;
    } catch (error) {
      return this.handleError(error, 'getHourlyPrices', {
        tokenAddress,
        chain,
        page,
        limit,
      });
    }
  }

  private handleError(
    error: any,
    operation: string,
    context: Record<string, any>,
  ): never {
    this.logger.error(`Error in ${operation}`, 'PriceTrackerController', {
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : error,
      context,
    });

    if (error instanceof NotFoundException) {
      throw error;
    }

    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new InternalServerErrorException(
      `An error occurred while ${operation.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
    );
  }

  private truncateAddress(address: string): string {
    return address.length > 10
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;
  }
}
