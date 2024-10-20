import { Module } from '@nestjs/common';
import { PriceTrackerModule } from '../price-tracker/price-tracker.module';
import { SwapController } from './controllers/swap.controller';
import { SwapService } from './services/swap.service';

@Module({
  imports: [PriceTrackerModule],
  controllers: [SwapController],
  providers: [SwapService],
})
export class SwapModule {}
