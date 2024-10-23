import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoggerService } from 'src/common/services/logger.service';
import { BaseRepository } from 'src/core/repository/base.repository';
import { ChainEnum } from '../../price-tracker/enums/chain.enum';
import { SignificantPriceAlert } from '../entities/significant-price-alert.entity';

@Injectable()
export class SignificantPriceAlertRepository extends BaseRepository<SignificantPriceAlert> {
  constructor(dataSource: DataSource, logger: LoggerService) {
    super(dataSource, SignificantPriceAlert, logger);
  }

  async findActiveAlerts(): Promise<SignificantPriceAlert[]> {
    // Fetch only alerts that are active
    return this.repository.find({
      where: { isActive: true },
    });
  }

  async findAlertByChain(
    chain: ChainEnum,
  ): Promise<SignificantPriceAlert | null> {
    return this.repository.findOne({
      where: { chain, isActive: true },
    });
  }

  async updateLastCheckedTime(id: string, lastCheckedAt: Date): Promise<void> {
    await this.repository.update(id, { lastCheckedAt });
  }
}
