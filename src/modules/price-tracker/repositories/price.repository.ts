import { Injectable } from '@nestjs/common';
import { DataSource, Between, LessThan, Repository } from 'typeorm';
import { LoggerService } from 'src/common/services/logger.service';
import { BaseRepository } from 'src/core/repository/base.repository';
import { Price } from '../entities/price.entity';
import { Token } from '../entities/token.entity';
import { TokenMetadata } from '@/shared/interfaces/IToken';
import {
  PaginationOptions,
  PaginationResult,
} from 'src/common/interfaces/IPagination';

interface PriceData {
  usdPrice: number;
  percentageChange1h?: number;
  percentageChange24h?: number;
  timestamp: Date;
}

@Injectable()
export class PriceRepository extends BaseRepository<Price> {
  private readonly tokenRepository: Repository<Token>;

  constructor(dataSource: DataSource, logger: LoggerService) {
    super(dataSource, Price, logger);
    this.tokenRepository = dataSource.getRepository(Token);
  }

  async ensureToken(address: string, chain: string): Promise<string> {
    let token = await this.tokenRepository.findOne({
      where: { address, chain },
    });

    if (!token) {
      token = this.tokenRepository.create({
        address,
        chain,
        symbol: '',
        name: '',
      });
      token = await this.tokenRepository.save(token);
      this.logger.debug('Created new token', 'PriceRepository', {
        address,
        chain,
        tokenId: token.id,
      });
    } else {
      this.logger.debug('Found existing token', 'PriceRepository', {
        address,
        chain,
        tokenId: token.id,
      });
    }

    return token.id;
  }

  async findLatestPrice(tokenId: string): Promise<Price | null> {
    return await this.repository.findOne({
      where: { tokenId },
      order: { timestamp: 'DESC' },
    });
  }

  async savePrice(tokenId: string, priceData: PriceData): Promise<Price> {
    const price = this.repository.create({
      tokenId,
      usdPrice: priceData.usdPrice,
      percentageChange1h: priceData.percentageChange1h,
      percentageChange24h: priceData.percentageChange24h,
      timestamp: priceData.timestamp,
    });

    return await this.repository.save(price);
  }

  async findHourlyPrices(
    tokenId: string,
    startTime: Date,
    endTime: Date,
    paginationOptions: PaginationOptions<Price>,
  ): Promise<PaginationResult<Price>> {
    const { page = 1, limit = 24 } = paginationOptions;
    const skip = (page - 1) * limit;

    const [prices, total] = await this.repository.findAndCount({
      where: { tokenId, timestamp: Between(startTime, endTime) },
      order: { timestamp: 'DESC' },
      skip,
      take: limit,
    });

    return { data: prices, total, page, limit };
  }

  async findPriceOneHourAgo(tokenId: string): Promise<Price | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return await this.repository.findOne({
      where: { tokenId, timestamp: LessThan(oneHourAgo) },
      order: { timestamp: 'DESC' },
    });
  }

  async findPriceAtTime(tokenId: string, time: Date): Promise<Price | null> {
    try {
      // Find the latest price before the specified time
      return await this.repository.findOne({
        where: {
          tokenId,
          timestamp: LessThan(time),
        },
        order: { timestamp: 'DESC' },
        relations: ['token'],
      });
    } catch (error) {
      this.logger.error(
        'Error finding price at specified time',
        'PriceRepository',
        {
          error,
          context: { tokenId, time },
        },
      );
      throw error;
    }
  }

  async updateTokenMetadata(
    tokenId: string,
    metadata: TokenMetadata,
  ): Promise<void> {
    await this.tokenRepository.update(tokenId, {
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals ? parseInt(metadata.decimals) : null,
    });
  }
}
