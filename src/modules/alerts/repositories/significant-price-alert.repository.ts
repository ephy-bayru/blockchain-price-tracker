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
    return this.repository.find();
  }

  async findAlertByChain(
    chain: ChainEnum,
  ): Promise<SignificantPriceAlert | null> {
    return this.repository.findOne({ where: { chain } });
  }

  async updateLastCheckedTime(id: string, lastCheckedAt: Date): Promise<void> {
    await this.update(id, { lastCheckedAt });
  }
}
