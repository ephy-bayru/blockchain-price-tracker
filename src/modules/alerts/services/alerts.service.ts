import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SignificantPriceAlertRepository } from '../repositories/significant-price-alert.repository';
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
import { SignificantPriceAlert } from '../entities/significant-price-alert.entity';

@Injectable()
export class AlertsService {
  constructor(
    private readonly significantPriceAlertRepository: SignificantPriceAlertRepository,
    private readonly userPriceAlertRepository: UserPriceAlertRepository,
    private readonly priceTrackerService: PriceTrackerService,
    private readonly logger: LoggerService,
  ) {}

  async createUserAlert(
    createUserAlertDto: CreateUserAlertDto,
  ): Promise<AlertResponseDto> {
    const { tokenAddress, chain, targetPrice, condition, userEmail } =
      createUserAlertDto;

    try {
      // Check if the token exists and is tracked
      const latestPrice = await this.priceTrackerService.getLatestPrice(
        tokenAddress,
        chain,
      );
      if (!latestPrice) {
        // If the token doesn't exist, create it
        await this.priceTrackerService.createToken(tokenAddress, chain);
        this.logger.info(
          `Created new token for alert: ${tokenAddress} on ${chain}`,
          'AlertsService',
        );
      }

      // Check if user has reached the maximum number of alerts
      const userAlertCount =
        await this.userPriceAlertRepository.countActiveAlertsByUser(userEmail);
      if (userAlertCount >= ALERT_CONSTANTS.MAX_ALERTS_PER_USER) {
        this.logger.warn(
          `Max alerts reached for user: ${userEmail}`,
          'AlertsService',
        );
        throw new BadRequestException(ERROR_MESSAGES.MAX_ALERTS_REACHED);
      }

      const newAlert = await this.userPriceAlertRepository.create({
        tokenAddress,
        chain,
        targetPrice,
        condition,
        userEmail,
      });

      this.logger.log(`Created new user alert`, 'AlertsService', { newAlert });
      return this.mapToAlertResponseDto(newAlert);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error creating user alert`, 'AlertsService', {
        error,
        createUserAlertDto,
      });
      throw new InternalServerErrorException('Failed to create user alert');
    }
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
      return {
        ...result,
        data: result.data.map(this.mapToAlertResponseDto),
      };
    } catch (error) {
      this.logger.error(`Error fetching user alerts`, 'AlertsService', {
        error,
        userEmail,
      });
      throw new InternalServerErrorException('Failed to fetch user alerts');
    }
  }

  async getUserAlert(id: string): Promise<AlertResponseDto> {
    try {
      const alert = await this.userPriceAlertRepository.findOne(id);
      if (!alert) {
        this.logger.warn(`Alert not found: ${id}`, 'AlertsService');
        throw new NotFoundException(ERROR_MESSAGES.ALERT_NOT_FOUND);
      }
      return this.mapToAlertResponseDto(alert);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching user alert`, 'AlertsService', {
        error,
        id,
      });
      throw new InternalServerErrorException('Failed to fetch user alert');
    }
  }

  async deactivateUserAlert(id: string): Promise<void> {
    try {
      await this.userPriceAlertRepository.deactivateAlert(id);
      this.logger.log(`Deactivated user alert`, 'AlertsService', {
        alertId: id,
      });
    } catch (error) {
      this.logger.error(`Error deactivating user alert`, 'AlertsService', {
        error,
        id,
      });
      throw new InternalServerErrorException('Failed to deactivate user alert');
    }
  }

  async getSignificantPriceAlert(
    chain: ChainEnum,
  ): Promise<SignificantPriceAlert> {
    try {
      const alert =
        await this.significantPriceAlertRepository.findAlertByChain(chain);
      if (!alert) {
        // Create a default significant price alert if not found
        const newAlert = await this.significantPriceAlertRepository.create({
          chain,
          thresholdPercentage:
            ALERT_CONSTANTS.SIGNIFICANT_PRICE_CHANGE_THRESHOLD,
          timeFrame: ALERT_CONSTANTS.SIGNIFICANT_PRICE_CHANGE_TIMEFRAME,
          recipientEmail: ALERT_CONSTANTS.DEFAULT_RECIPIENT_EMAIL,
          lastCheckedAt: new Date(),
        });
        this.logger.info(
          `Created default significant price alert for ${chain}`,
          'AlertsService',
        );
        return newAlert;
      }
      return alert;
    } catch (error) {
      this.logger.error(
        `Error fetching/creating significant price alert`,
        'AlertsService',
        { error, chain },
      );
      throw new InternalServerErrorException(
        'Failed to fetch/create significant price alert',
      );
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
}
