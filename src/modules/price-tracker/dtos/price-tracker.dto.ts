import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
  IsDate,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChainEnum } from '../enums/chain.enum';

export class GetHourlyPricesDto {
  @ApiProperty({
    description: 'The address of the token',
    example: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  })
  @IsString()
  tokenAddress: string;

  @ApiProperty({
    enum: ChainEnum,
    description: 'Blockchain network (e.g., ethereum, polygon)',
    example: 'ethereum',
  })
  @IsEnum(ChainEnum)
  chain: ChainEnum;

  @ApiProperty({
    required: false,
    description: 'Page number for pagination (default is 1)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Number of items per page (default is 24)',
    default: 24,
    minimum: 1,
    example: 24,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 24;
}

export class PriceResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the price entry',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'The address of the token',
    example: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  })
  @IsString()
  tokenAddress: string;

  @ApiProperty({
    description: 'The symbol of the token',
    example: 'UNI',
  })
  @IsString()
  tokenSymbol: string;

  @ApiProperty({
    description: 'The name of the token',
    example: 'Uniswap',
  })
  @IsString()
  tokenName: string;

  @ApiProperty({
    description: 'The current price in USD',
    example: 5.67,
  })
  @IsNumber()
  usdPrice: number;

  @ApiProperty({
    enum: ChainEnum,
    description: 'Blockchain network',
    example: 'ethereum',
  })
  @IsEnum(ChainEnum)
  chain: ChainEnum;

  @ApiProperty({
    description: 'Timestamp of the price data',
    example: '2023-10-17T14:30:00Z',
  })
  @IsDate()
  timestamp: Date;

  @ApiProperty({
    description: 'Percentage change in the last hour',
    example: 2.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  percentageChange1h?: number;
}

export class PaginatedPriceResponseDto {
  @ApiProperty({
    type: [PriceResponseDto],
    description: 'Array of price data',
  })
  data: PriceResponseDto[];

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  @IsInt()
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  @IsInt()
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 24,
  })
  @IsInt()
  limit: number;
}
