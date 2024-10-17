import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { LoggerService } from 'src/common/services/logger.service';

@Injectable()
export class PriceTrackingHealthIndicator extends HealthIndicator {
  constructor(private readonly logger: LoggerService) {
    super();
  }

  async checkPriceTrackingService(): Promise<HealthIndicatorResult> {
    try {
      // Here, you would implement the actual check for your price tracking service
      // For this example, we'll simulate a check
      const lastUpdate = new Date();
      const isHealthy = true; // Replace with actual check

      return this.getStatus('priceTracking', isHealthy, { lastUpdate });
    } catch (error) {
      this.logger.error(
        'Price tracking health check failed',
        'PriceTrackingHealthIndicator',
        { error },
      );
      return this.getStatus('priceTracking', false, {
        error: 'Price tracking service is not functioning correctly',
      });
    }
  }
}
