import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SignificantPriceAlertRepository } from '../repositories/significant-price-alert.repository';
import { UserPriceAlertRepository } from '../repositories/user-price-alert.repository';
import { PriceTrackerService } from '../../price-tracker/services/price-tracker.service';
import { LoggerService } from 'src/common/services/logger.service';
import { EmailService } from 'src/shared/services/email.service';
import { ChainEnum } from '../../price-tracker/enums/chain.enum';
import { SignificantPriceAlert } from '../entities/significant-price-alert.entity';
import { UserPriceAlert } from '../entities/user-price-alert.entity';
import { ALERT_CONSTANTS } from '../constants/alert-constants';

@Injectable()
export class AlertCheckerService {
  constructor(
    private readonly significantPriceAlertRepository: SignificantPriceAlertRepository,
    private readonly userPriceAlertRepository: UserPriceAlertRepository,
    private readonly priceTrackerService: PriceTrackerService,
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSignificantPriceChanges() {
    this.logger.log(
      'Starting significant price change check',
      'AlertCheckerService',
    );
    const alerts =
      await this.significantPriceAlertRepository.findActiveAlerts();

    for (const alert of alerts) {
      await this.processSingleSignificantAlert(alert);
    }

    this.logger.log(
      'Completed significant price change check',
      'AlertCheckerService',
    );
  }

  private async processSingleSignificantAlert(alert: SignificantPriceAlert) {
    try {
      const chainPrices = await this.priceTrackerService.getChainPrices(
        alert.chain as ChainEnum,
      );
      const oneHourAgo = new Date(Date.now() - alert.timeFrame * 60000);
      const oldChainPrices =
        await this.priceTrackerService.getChainPricesAtTime(
          alert.chain as ChainEnum,
          oneHourAgo,
        );

      const significantChanges = this.calculateSignificantChanges(
        chainPrices,
        oldChainPrices,
        alert.thresholdPercentage,
      );

      if (significantChanges.length > 0) {
        await this.emailService.sendSignificantPriceChangeAlert(
          ALERT_CONSTANTS.DEFAULT_RECIPIENT_EMAIL, // Use the default email from constants
          alert.chain as ChainEnum,
          significantChanges,
        );
        this.logger.log(
          'Sent significant price change alert',
          'AlertCheckerService',
          {
            chain: alert.chain,
            changesCount: significantChanges.length,
          },
        );
      }

      await this.significantPriceAlertRepository.updateLastCheckedTime(
        alert.id,
        new Date(),
      );
    } catch (error) {
      this.logger.error(
        'Error processing significant price alert',
        'AlertCheckerService',
        {
          alertId: alert.id,
          chain: alert.chain,
          error: error.message,
          stack: error.stack,
        },
      );
    }
  }

  private calculateSignificantChanges(
    currentPrices: Record<string, number>,
    oldPrices: Record<string, number>,
    thresholdPercentage: number,
  ) {
    return Object.entries(currentPrices)
      .map(([tokenAddress, currentPrice]) => {
        const oldPrice = oldPrices[tokenAddress];
        if (oldPrice) {
          const percentageChange = ((currentPrice - oldPrice) / oldPrice) * 100;
          if (Math.abs(percentageChange) >= thresholdPercentage) {
            return { tokenAddress, percentageChange, currentPrice };
          }
        }
        return null;
      })
      .filter(
        (change): change is NonNullable<typeof change> => change !== null,
      );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUserPriceAlerts() {
    this.logger.log('Starting user price alert check', 'AlertCheckerService');
    const activeAlerts = await this.userPriceAlertRepository.findActiveAlerts();

    for (const alert of activeAlerts) {
      await this.processSingleUserAlert(alert);
    }

    this.logger.log('Completed user price alert check', 'AlertCheckerService');
  }

  private async processSingleUserAlert(alert: UserPriceAlert) {
    try {
      const currentPriceData = await this.priceTrackerService.getLatestPrice(
        alert.tokenAddress,
        alert.chain,
      );

      if (!currentPriceData) {
        this.logger.warn(
          `No price data found for token ${alert.tokenAddress} on ${alert.chain}`,
          'AlertCheckerService',
        );
        return;
      }

      const currentPrice = currentPriceData.usdPrice;
      const isTriggered = this.isAlertTriggered(alert, currentPrice);

      if (isTriggered) {
        await this.emailService.sendUserPriceAlert(
          alert.userEmail,
          alert.tokenAddress,
          alert.chain as ChainEnum,
          currentPrice,
          alert.targetPrice,
          alert.condition,
        );
        await this.userPriceAlertRepository.deactivateAlert(alert.id);
        this.logger.log('Sent user price alert', 'AlertCheckerService', {
          alertId: alert.id,
          tokenAddress: alert.tokenAddress,
          chain: alert.chain,
          currentPrice,
          targetPrice: alert.targetPrice,
          condition: alert.condition,
        });
      }
    } catch (error) {
      this.logger.error(
        'Error processing user price alert',
        'AlertCheckerService',
        {
          alertId: alert.id,
          tokenAddress: alert.tokenAddress,
          chain: alert.chain,
          error: error.message,
          stack: error.stack,
        },
      );
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
}
