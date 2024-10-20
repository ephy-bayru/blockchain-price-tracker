import { ApiProperty } from '@nestjs/swagger';
import { ChainEnum } from '../../price-tracker/enums/chain.enum';

export class AlertResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the alert',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The address of the token',
    example: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  })
  tokenAddress: string;

  @ApiProperty({
    enum: ChainEnum,
    description: 'Blockchain network',
    example: 'ethereum',
  })
  chain: string;

  @ApiProperty({
    description: 'The target price for the alert in USD',
    example: 1000,
  })
  targetPrice: number;

  @ApiProperty({
    description: 'The condition for triggering the alert',
    enum: ['above', 'below'],
    example: 'above',
  })
  condition: 'above' | 'below';

  @ApiProperty({
    description: 'The email address to receive the alert',
    example: 'user@example.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'Whether the alert is currently active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Timestamp of when the alert was created',
    example: '2023-10-20T14:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp of when the alert was last updated',
    example: '2023-10-20T14:30:00Z',
  })
  updatedAt: Date;
}
