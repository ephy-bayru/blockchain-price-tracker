import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PriceRepository } from './repositories/price.repository';
import { Token } from './entities/token.entity';
import { Price } from './entities/price.entity';
import { PriceTrackerCron } from './price-tracker.cron';
import { PriceTrackerService } from './services/price-tracker.service';
import { PriceTrackerController } from './controllers/price-tracker.controller';
import { SharedModule } from 'src/shared/shared.module';
import { LoggerService } from 'src/common/services/logger.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token, Price]),
    CacheModule.register(),
    ConfigModule,
    SharedModule,
    EventEmitterModule.forRoot(),
    CommonModule,
  ],
  providers: [
    PriceTrackerService,
    PriceRepository,
    PriceTrackerCron,
    LoggerService,
  ],
  controllers: [PriceTrackerController],
  exports: [PriceTrackerService],
})
export class PriceTrackerModule {}
