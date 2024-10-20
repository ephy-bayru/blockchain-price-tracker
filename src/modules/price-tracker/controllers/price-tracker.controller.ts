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
  constructor(
    private readonly priceTrackerService: PriceTrackerService,
    private readonly logger: LoggerService,
  ) {}

  @Get('latest/:chain/:tokenAddress')
  @CacheKey('latest_price')
  @CacheTTL(60) // Cache for 1 minute
  @GetLatestPriceDocs()
  async getLatestPrice(
    @Param('chain', new ParseEnumPipe(ChainEnum)) chain: ChainEnum,
    @Param('tokenAddress') tokenAddress: string,
  ): Promise<PriceResponseDto> {
    this.logger.debug(`Fetching latest price`, 'PriceTrackerController', {
      chain,
      tokenAddress,
    });
    try {
      let price = await this.priceTrackerService.getLatestPrice(
        tokenAddress,
        chain,
      );

      if (!price) {
        this.logger.info(
          `Token not found, creating new token`,
          'PriceTrackerController',
          { chain, tokenAddress },
        );
        await this.priceTrackerService.createToken(tokenAddress, chain);
        price = await this.priceTrackerService.getLatestPrice(
          tokenAddress,
          chain,
        );
      }

      if (!price) {
        throw new NotFoundException(
          `No price data found for token ${tokenAddress} on ${chain}`,
        );
      }

      return mapPriceToResponseDto(price);
    } catch (error) {
      this.logger.error(
        `Error fetching latest price`,
        'PriceTrackerController',
        {
          chain,
          tokenAddress,
          error: error.message,
          stack: error.stack,
        },
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occurred while fetching the latest price',
      );
    }
  }

  @Get('hourly-prices')
  @CacheKey('hourly_prices')
  @CacheTTL(300) // Cache for 5 minutes
  @GetHourlyPricesDocs()
  async getHourlyPrices(
    @Query(new ValidationPipe({ transform: true })) query: GetHourlyPricesDto,
  ): Promise<PaginatedPriceResponseDto> {
    this.logger.debug(`Fetching hourly prices`, 'PriceTrackerController', {
      query,
    });
    try {
      const { tokenAddress, chain, page, limit } = query;
      const paginationOptions = { page, limit };
      const result = await this.priceTrackerService.getHourlyPrices(
        tokenAddress,
        chain,
        paginationOptions,
      );
      return {
        data: result.data.map(mapPriceToResponseDto),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching hourly prices`,
        'PriceTrackerController',
        {
          query,
          error: error.message,
          stack: error.stack,
        },
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occurred while fetching hourly prices',
      );
    }
  }
}
