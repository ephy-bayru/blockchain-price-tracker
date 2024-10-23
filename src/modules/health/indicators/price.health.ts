import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { LoggerService } from 'src/common/services/logger.service';
import { PriceTrackerService } from '@/modules/price-tracker/services/price-tracker.service';

@Injectable()
export class PriceTrackingHealthIndicator extends HealthIndicator {
  constructor(
    private readonly logger: LoggerService,
    private readonly priceTrackerService: PriceTrackerService,
  ) {
    super();
  }

  async checkPriceTrackingService(): Promise<HealthIndicatorResult> {
    try {
      const chain = 'ethereum';
      const tokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

      const latestPrice = await this.priceTrackerService.getLatestPrice(
        tokenAddress,
        chain,
      );

      const isHealthy = !!latestPrice;

      if (isHealthy) {
        return this.getStatus('priceTracking', true, {
          lastUpdate: latestPrice.timestamp,
          usdPrice: latestPrice.usdPrice,
        });
      } else {
        throw new Error('No latest price data available');
      }
    } catch (error) {
      this.logger.error(
        'Price tracking health check failed',
        'PriceTrackingHealthIndicator',
        { error: error.message },
      );

      return this.getStatus('priceTracking', false, {
        error: error.message || 'Unable to retrieve latest price data',
      });
    }
  }
}
