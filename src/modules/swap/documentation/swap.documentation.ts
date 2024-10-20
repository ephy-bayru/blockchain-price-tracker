import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiTags } from '@nestjs/swagger';
import { SwapRequestDto } from '../dtos/swap-request.dto';
import { SwapResponseDto } from '../dtos/swap-response.dto';

export function SwapControllerDocs() {
  return applyDecorators(ApiTags('swap'));
}

export function CalculateSwapDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Calculate ETH to BTC swap' }),
    ApiBody({
      type: SwapRequestDto,
      description: 'Swap request details',
    }),
    ApiResponse({
      status: 200,
      description: 'Swap calculation successful',
      type: SwapResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
