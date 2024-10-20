import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  PriceResponseDto,
  PaginatedPriceResponseDto,
} from '../dtos/price-tracker.dto';
import { ChainEnum } from '../enums/chain.enum';

export function PriceTrackerControllerDocs() {
  return applyDecorators(ApiTags('price-tracker'));
}

export function GetLatestPriceDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get the latest price for a token' }),
    ApiParam({
      name: 'chain',
      enum: ChainEnum,
      description: 'Blockchain network (e.g., ethereum, polygon)',
      example: 'ethereum',
    }),
    ApiParam({
      name: 'tokenAddress',
      description: 'Token address (contract address of the token)',
      example: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    }),
    ApiResponse({
      status: 200,
      description: 'Latest price retrieved successfully',
      type: PriceResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Token or price not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}

export function GetHourlyPricesDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get hourly prices for a token' }),
    ApiQuery({
      name: 'tokenAddress',
      description: 'Token address (contract address of the token)',
      example: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    }),
    ApiQuery({
      name: 'chain',
      enum: ChainEnum,
      description: 'Blockchain network (e.g., ethereum, polygon)',
      example: 'ethereum',
    }),
    ApiQuery({
      name: 'page',
      description: 'Page number for pagination (default is 1)',
      required: false,
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      description: 'Number of items per page (default is 24)',
      required: false,
      example: 24,
    }),
    ApiResponse({
      status: 200,
      description: 'Hourly prices retrieved successfully',
      type: PaginatedPriceResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input',
    }),
    ApiResponse({
      status: 404,
      description: 'Token not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
