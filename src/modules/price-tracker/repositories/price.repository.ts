import { Injectable } from '@nestjs/common';
import { DataSource, Between, LessThan, MoreThanOrEqual } from 'typeorm';
import { LoggerService } from 'src/common/services/logger.service';
import { BaseRepository } from 'src/core/repository/base.repository';
import { Price } from '../entities/price.entity';
import {
  PaginationOptions,
  PaginationResult,
} from 'src/common/interfaces/IPagination';

@Injectable()
export class PriceRepository extends BaseRepository<Price> {
  constructor(dataSource: DataSource, logger: LoggerService) {
    super(dataSource, Price, logger);
  }

  async findLatestPrice(tokenId: string): Promise<Price | null> {
    return this.repository.findOne({
      where: { tokenId },
      order: { timestamp: 'DESC' },
      relations: ['token'],
    });
  }

  async findHourlyPrices(
    tokenId: string,
    startTime: Date,
    endTime: Date,
    paginationOptions: PaginationOptions<Price>,
  ): Promise<PaginationResult<Price>> {
    const { page = 1, limit = 24 } = paginationOptions;
    const skip = (page - 1) * limit;

    // Fetch hourly prices directly from the database
    const [hourlyPrices, total] = await this.repository
      .createQueryBuilder('price')
      .where('price.tokenId = :tokenId', { tokenId })
      .andWhere('price.timestamp BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      })
      .orderBy('price.timestamp', 'DESC')
      .groupBy("DATE_TRUNC('hour', price.timestamp)")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: hourlyPrices,
      total,
      page,
      limit,
    };
  }

  async findPriceAtOrBefore(
    tokenId: string,
    timestamp: Date,
  ): Promise<Price | null> {
    return this.repository.findOne({
      where: {
        tokenId,
        timestamp: LessThan(timestamp),
      },
      order: { timestamp: 'DESC' },
      relations: ['token'],
    });
  }

  async findPricesInRange(
    tokenId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Price[]> {
    return this.repository.find({
      where: {
        tokenId,
        timestamp: Between(startTime, endTime),
      },
      order: { timestamp: 'ASC' },
      relations: ['token'],
    });
  }

  async saveBulkPrices(prices: Partial<Price>[]): Promise<Price[]> {
    return this.repository.save(prices);
  }

  async findPriceChange(
    tokenId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<{ startPrice: number; endPrice: number } | null> {
    const [startPrice, endPrice] = await Promise.all([
      this.repository.findOne({
        where: { tokenId, timestamp: MoreThanOrEqual(startTime) },
        order: { timestamp: 'ASC' },
      }),
      this.repository.findOne({
        where: { tokenId, timestamp: LessThan(endTime) },
        order: { timestamp: 'DESC' },
      }),
    ]);

    if (startPrice && endPrice) {
      return { startPrice: startPrice.usdPrice, endPrice: endPrice.usdPrice };
    }
    return null;
  }
}
