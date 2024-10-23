import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SignificantPriceAlertRepository } from '../repositories/significant-price-alert.repository';
import { UserPriceAlertRepository } from '../repositories/user-price-alert.repository';
import { PriceTrackerService } from '../../price-tracker/services/price-tracker.service';
import { LoggerService } from 'src/common/services/logger.service';
import { EmailService } from 'src/shared/services/email.service';
import { UserPriceAlert } from '../entities/user-price-alert.entity';
import { SignificantPriceAlert } from '../entities/significant-price-alert.entity';
import { ChainEnum } from '@/modules/price-tracker/enums/chain.enum';

@Injectable()
export class AlertCheckerService {
  private readonly retryAttempts: number;
  private readonly retryDelay: number;

  constructor(
    private readonly significantPriceAlertRepository: SignificantPriceAlertRepository,
    private readonly userPriceAlertRepository: UserPriceAlertRepository,
    private readonly priceTrackerService: PriceTrackerService,
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
  ) {
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSignificantPriceChanges() {
    try {
      const alerts =
        await this.significantPriceAlertRepository.findActiveAlerts();
      await Promise.allSettled(
        alerts.map((alert) =>
          this.withRetry(() => this.processSingleSignificantAlert(alert)),
        ),
      );
    } catch (error) {
      this.logger.error(
        'Failed to process significant price changes',
        'AlertCheckerService',
        error,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUserPriceAlerts() {
    try {
      const activeAlerts =
        await this.userPriceAlertRepository.findActiveAlerts();
      await Promise.allSettled(
        activeAlerts.map((alert) =>
          this.withRetry(() => this.processSingleUserAlert(alert)),
        ),
      );
    } catch (error) {
      this.logger.error(
        'Failed to process user price alerts',
        'AlertCheckerService',
        error,
      );
    }
  }

  private async processSingleSignificantAlert(alert: SignificantPriceAlert) {
    try {
      const tokenAddresses = await this.withRetry(() =>
        this.priceTrackerService.getTrackedTokens(alert.chain),
      );
      const significantChanges: Array<{
        tokenAddress: string;
        percentageChange: number;
        currentPrice: number;
      }> = [];

      const pastTime = new Date(Date.now() - alert.timeFrame * 60 * 1000);

      for (const address of tokenAddresses) {
        try {
          const currentPrice = await this.withRetry(() =>
            this.priceTrackerService.getLatestPrice(address, alert.chain),
          );

          const oldPrice = await this.withRetry(() =>
            this.priceTrackerService.getPriceAtTime(
              address,
              alert.chain,
              pastTime,
            ),
          );

          if (oldPrice && currentPrice) {
            const percentageChange =
              ((currentPrice.usdPrice - oldPrice.usdPrice) /
                oldPrice.usdPrice) *
              100;

            if (Math.abs(percentageChange) >= alert.thresholdPercentage) {
              significantChanges.push({
                tokenAddress: address,
                percentageChange,
                currentPrice: currentPrice.usdPrice,
              });
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failed to process price data for ${address}`,
            'AlertCheckerService',
            { error },
          );
          continue;
        }
      }

      if (significantChanges.length > 0) {
        await this.withRetry(() =>
          this.emailService.sendSignificantPriceChangeAlert(
            alert.recipientEmail,
            alert.chain as ChainEnum,
            significantChanges,
          ),
        );
        await this.significantPriceAlertRepository.updateLastCheckedTime(
          alert.id,
          new Date(),
        );
      }
    } catch (error) {
      this.logger.error(
        'Error processing significant price alert',
        'AlertCheckerService',
        { alertId: alert.id, error },
      );
    }
  }

  private async processSingleUserAlert(alert: UserPriceAlert) {
    try {
      const currentPriceData = await this.withRetry(() =>
        this.priceTrackerService.getLatestPrice(
          alert.tokenAddress,
          alert.chain,
        ),
      );

      if (
        currentPriceData &&
        this.isAlertTriggered(alert, currentPriceData.usdPrice)
      ) {
        await this.withRetry(() =>
          this.emailService.sendUserPriceAlert(
            alert.userEmail,
            alert.tokenAddress,
            alert.chain as ChainEnum,
            currentPriceData.usdPrice,
            alert.targetPrice,
            alert.condition,
          ),
        );
        await this.userPriceAlertRepository.deactivateAlert(alert.id);
      }
    } catch (error) {
      this.logger.error('Error processing user alert', 'AlertCheckerService', {
        alertId: alert.id,
        error,
      });
    }
  }

  private isAlertTriggered(
    alert: UserPriceAlert,
    currentPrice: number,
  ): boolean {
    return (
      (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
      (alert.condition === 'below' && currentPrice <= alert.targetPrice)
    );
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt < this.retryAttempts) {
        this.logger.warn(
          `Retrying operation (${attempt}/${this.retryAttempts})`,
          'AlertCheckerService',
          { error: error.message },
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.withRetry(operation, attempt + 1);
      }
      throw error;
    }
  }
}
