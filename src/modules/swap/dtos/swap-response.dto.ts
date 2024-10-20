import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class SwapResponseDto {
  @ApiProperty({
    description: 'The amount of BTC that can be obtained',
    example: 0.059,
  })
  @IsNumber()
  btcAmount: number;

  @ApiProperty({
    description: 'The total fee in ETH',
    example: 0.0003,
  })
  @IsNumber()
  feeEth: number;

  @ApiProperty({
    description: 'The total fee in USD',
    example: 0.54,
  })
  @IsNumber()
  feeUsd: number;
}
