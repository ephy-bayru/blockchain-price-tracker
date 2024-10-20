import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './controllers/alerts.controller';
import { AlertsService } from './services/alerts.service';
import { AlertCheckerService } from './services/alert-checker.service';
import { SignificantPriceAlert } from './entities/significant-price-alert.entity';
import { UserPriceAlert } from './entities/user-price-alert.entity';
import { SignificantPriceAlertRepository } from './repositories/significant-price-alert.repository';
import { UserPriceAlertRepository } from './repositories/user-price-alert.repository';
import { PriceTrackerModule } from '../price-tracker/price-tracker.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SignificantPriceAlert, UserPriceAlert]),
    PriceTrackerModule,
    SharedModule,
  ],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    AlertCheckerService,
    SignificantPriceAlertRepository,
    UserPriceAlertRepository,
  ],
  exports: [AlertsService],
})
export class AlertsModule {}
