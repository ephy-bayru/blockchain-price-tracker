import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoggerService } from 'src/common/services/logger.service';
import { BaseRepository } from 'src/core/repository/base.repository';
import { UserPriceAlert } from '../entities/user-price-alert.entity';
import { ChainEnum } from '../../price-tracker/enums/chain.enum';
import {
  PaginationOptions,
  PaginationResult,
} from 'src/common/interfaces/IPagination';

@Injectable()
export class UserPriceAlertRepository extends BaseRepository<UserPriceAlert> {
  constructor(dataSource: DataSource, logger: LoggerService) {
    super(dataSource, UserPriceAlert, logger);
  }

  async findActiveAlerts(): Promise<UserPriceAlert[]> {
    return this.repository.find({
      where: { isActive: true },
      relations: ['token'],
    });
  }

  async findAlertsByUser(
    userEmail: string,
    paginationOptions: PaginationOptions<UserPriceAlert>,
  ): Promise<PaginationResult<UserPriceAlert>> {
    return this.findAll({
      ...paginationOptions,
      options: {
        where: { userEmail, isActive: true },
        relations: ['token'],
      },
    });
  }

  async findAlertsByTokenAndChain(
    tokenAddress: string,
    chain: ChainEnum,
  ): Promise<UserPriceAlert[]> {
    return this.repository.find({
      where: { tokenAddress, chain, isActive: true },
      relations: ['token'],
    });
  }

  async countActiveAlertsByUser(userEmail: string): Promise<number> {
    return this.repository.count({
      where: { userEmail, isActive: true },
    });
  }

  async deactivateAlert(id: string): Promise<void> {
    await this.repository.update(id, { isActive: false });
  }
}
