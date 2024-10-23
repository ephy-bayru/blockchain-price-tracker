import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { MoralisHealthIndicator } from './indicators/moralis.health';
import { PriceTrackingHealthIndicator } from './indicators/price.health';
import { PriceTrackerModule } from '../price-tracker/price-tracker.module';

@Module({
  imports: [TerminusModule, HttpModule, PriceTrackerModule],
  controllers: [HealthController],
  providers: [PriceTrackingHealthIndicator, MoralisHealthIndicator],
})
export class HealthModule {}
