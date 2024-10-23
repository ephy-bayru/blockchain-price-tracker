import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriceTrackerService } from '../../price-tracker/services/price-tracker.service';
import { LoggerService } from 'src/common/services/logger.service';
import { SwapRequestDto } from '../dtos/swap-request.dto';
import { SwapResponseDto } from '../dtos/swap-response.dto';
import { ChainEnum } from '../../price-tracker/enums/chain.enum';

@Injectable()
export class SwapService {
  private readonly feePercentage: number;
  private readonly ethAddress: string;
  private readonly btcAddress: string;

  constructor(
    private readonly priceTrackerService: PriceTrackerService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.feePercentage = this.configService.get<number>(
      'SWAP_FEE_PERCENTAGE',
      0.0003,
    ); // 0.03%
    this.ethAddress = this.configService.get<string>(
      'ETH_ADDRESS',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    );
    this.btcAddress = this.configService.get<string>(
      'BTC_ADDRESS',
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    );

    this.logger.log('SwapService initialized', 'SwapService', {
      feePercentage: this.feePercentage,
      ethAddress: this.ethAddress,
      btcAddress: this.btcAddress,
    });
  }

  async calculateEthToBtcSwap(
    swapRequest: SwapRequestDto,
  ): Promise<SwapResponseDto> {
    this.logger.log(
      `Calculating ETH to BTC swap for ${swapRequest.amount} ETH`,
      'SwapService',
    );

    try {
      this.validateSwapRequest(swapRequest);

      const [ethPrice, btcPrice] = await Promise.all([
        this.priceTrackerService.getLatestPrice(
          this.ethAddress,
          ChainEnum.ETHEREUM,
        ),
        this.priceTrackerService.getLatestPrice(
          this.btcAddress,
          ChainEnum.ETHEREUM,
        ),
      ]);

      if (!ethPrice || !btcPrice) {
        throw new Error('No price data found for tokens');
      }

      this.logger.debug('Fetched latest prices', 'SwapService', {
        ethPrice,
        btcPrice,
      });

      // Proceed with swap calculation
      const ethAmount = swapRequest.amount;
      const ethValueUsd = ethAmount * ethPrice.usdPrice;
      const btcAmount = ethValueUsd / btcPrice.usdPrice;

      const feeEth = ethAmount * this.feePercentage;
      const feeUsd = feeEth * ethPrice.usdPrice;

      const response: SwapResponseDto = {
        btcAmount: Number(btcAmount.toFixed(8)),
        feeEth: Number(feeEth.toFixed(8)),
        feeUsd: Number(feeUsd.toFixed(2)),
      };

      this.logger.log(`Swap calculation completed`, 'SwapService', {
        response,
      });

      return response;
    } catch (error) {
      this.logger.error(`Error calculating swap`, 'SwapService', {
        error: error.message,
        stack: error.stack,
        swapRequest,
      });
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to calculate swap');
    }
  }

  private validateSwapRequest(swapRequest: SwapRequestDto): void {
    if (swapRequest.amount <= 0) {
      this.logger.warn('Swap amount must be greater than 0', 'SwapService', {
        amount: swapRequest.amount,
      });
      throw new BadRequestException('Swap amount must be greater than 0');
    }
  }
}
