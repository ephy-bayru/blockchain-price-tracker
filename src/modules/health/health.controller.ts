import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { MoralisHealthIndicator } from './indicators/moralis.health';
import { LoggerService } from 'src/common/services/logger.service';
import { PriceTrackingHealthIndicator } from './indicators/price.health';
import { HealthCheckDocs } from './documentation/health.controller.documentation';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly moralis: MoralisHealthIndicator,
    private readonly priceTracking: PriceTrackingHealthIndicator,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  @HealthCheck()
  @HealthCheckDocs()
  async check(): Promise<HealthCheckResult> {
    try {
      const result = await this.health.check([
        () => this.db.pingCheck('database', { timeout: 3000 }),
        () => this.moralis.checkMoralisApiConnection(),
        () => this.priceTracking.checkPriceTrackingService(),
      ]);

      if (result.status === 'error') {
        throw new ServiceUnavailableException(result);
      }

      this.logger.log(
        'Health check completed successfully',
        'HealthController',
        result,
      );
      return result;
    } catch (error) {
      this.logger.error('Health check failed', 'HealthController', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
