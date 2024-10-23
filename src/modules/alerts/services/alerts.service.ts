import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserPriceAlertRepository } from '../repositories/user-price-alert.repository';
import { CreateUserAlertDto } from '../dtos/create-user-alert.dto';
import { AlertResponseDto } from '../dtos/alert-response.dto';
import { ChainEnum } from '../../price-tracker/enums/chain.enum';
import { PriceTrackerService } from '../../price-tracker/services/price-tracker.service';
import { ALERT_CONSTANTS, ERROR_MESSAGES } from '../constants/alert-constants';
import { LoggerService } from 'src/common/services/logger.service';
import {
  PaginationOptions,
  PaginationResult,
} from 'src/common/interfaces/IPagination';
import { UserPriceAlert } from '../entities/user-price-alert.entity';

@Injectable()
export class AlertsService {
  constructor(
    private readonly userPriceAlertRepository: UserPriceAlertRepository,
    private readonly priceTrackerService: PriceTrackerService,
    private readonly logger: LoggerService,
  ) {}

  async createUserAlert(
    createUserAlertDto: CreateUserAlertDto,
  ): Promise<AlertResponseDto> {
    const { tokenAddress, chain, targetPrice, condition, userEmail } =
      createUserAlertDto;

    await this.validateNewAlert(tokenAddress, chain, userEmail);

    const newAlert = await this.userPriceAlertRepository.create({
      tokenAddress,
      chain,
      targetPrice,
      condition,
      userEmail,
    });

    this.logger.info('Created new user alert', 'AlertsService', {
      tokenAddress: this.truncateAddress(tokenAddress),
      chain,
      condition,
      targetPrice,
    });

    return this.mapToAlertResponseDto(newAlert);
  }

  async getUserAlert(id: string): Promise<AlertResponseDto> {
    const alert = await this.userPriceAlertRepository.findOne(id);
    if (!alert) {
      this.logger.warn('Alert not found', 'AlertsService', { alertId: id });
      throw new NotFoundException(ERROR_MESSAGES.ALERT_NOT_FOUND);
    }

    return this.mapToAlertResponseDto(alert);
  }

  async getUserAlerts(
    userEmail: string,
    paginationOptions: PaginationOptions<UserPriceAlert>,
  ): Promise<PaginationResult<AlertResponseDto>> {
    try {
      const result = await this.userPriceAlertRepository.findAlertsByUser(
        userEmail,
        paginationOptions,
      );

      this.logger.debug('Retrieved user alerts', 'AlertsService', {
        userEmail,
        count: result.data.length,
        total: result.total,
      });

      return {
        ...result,
        data: result.data.map(this.mapToAlertResponseDto),
      };
    } catch (error) {
      this.logger.error('Failed to fetch user alerts', 'AlertsService', {
        userEmail,
        error: error.message,
        stack: error.stack,
      });
      throw new InternalServerErrorException('Failed to fetch user alerts');
    }
  }

  async deactivateUserAlert(id: string): Promise<void> {
    const alert = await this.userPriceAlertRepository.findOne(id);
    if (!alert) {
      throw new NotFoundException(ERROR_MESSAGES.ALERT_NOT_FOUND);
    }

    await this.userPriceAlertRepository.deactivateAlert(id);
    this.logger.info('Deactivated user alert', 'AlertsService', {
      alertId: id,
      tokenAddress: this.truncateAddress(alert.tokenAddress),
      chain: alert.chain,
    });
  }

  private async validateNewAlert(
    tokenAddress: string,
    chain: ChainEnum,
    userEmail: string,
  ): Promise<void> {
    const [latestPrice, userAlertCount] = await Promise.all([
      this.priceTrackerService.getLatestPrice(tokenAddress, chain),
      this.userPriceAlertRepository.countActiveAlertsByUser(userEmail),
    ]);

    if (!latestPrice) {
      throw new BadRequestException(ERROR_MESSAGES.TOKEN_NOT_FOUND);
    }

    if (userAlertCount >= ALERT_CONSTANTS.MAX_ALERTS_PER_USER) {
      throw new BadRequestException(ERROR_MESSAGES.MAX_ALERTS_REACHED);
    }
  }

  private mapToAlertResponseDto(alert: UserPriceAlert): AlertResponseDto {
    return {
      id: alert.id,
      tokenAddress: alert.tokenAddress,
      chain: alert.chain,
      targetPrice: alert.targetPrice,
      condition: alert.condition,
      userEmail: alert.userEmail,
      isActive: alert.isActive,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  private truncateAddress(address: string): string {
    return address.length > 10
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;
  }
}
