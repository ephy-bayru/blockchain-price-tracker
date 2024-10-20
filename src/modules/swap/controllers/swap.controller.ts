import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  ValidationPipe,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { SwapService } from '../services/swap.service';
import {
  SwapControllerDocs,
  CalculateSwapDocs,
} from '../documentation/swap.documentation';
import { SwapResponseDto } from '../dtos/swap-response.dto';
import { SwapRequestDto } from '../dtos/swap-request.dto';

@SwapControllerDocs()
@Controller({ path: 'swap', version: '1' })
@UseInterceptors(CacheInterceptor)
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  @Post('eth-to-btc')
  @CalculateSwapDocs()
  async calculateEthToBtcSwap(
    @Body(new ValidationPipe({ transform: true })) swapRequest: SwapRequestDto,
  ): Promise<SwapResponseDto> {
    try {
      return await this.swapService.calculateEthToBtcSwap(swapRequest);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        'An error occurred while calculating the swap',
      );
    }
  }
}
