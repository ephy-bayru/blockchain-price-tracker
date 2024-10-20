import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsEmail, IsIn } from 'class-validator';
import { ChainEnum } from '../../price-tracker/enums/chain.enum';

export class CreateUserAlertDto {
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
    description: 'The target price for the alert in USD',
    example: 1000,
  })
  @IsNumber()
  targetPrice: number;

  @ApiProperty({
    description: 'The condition for triggering the alert',
    enum: ['above', 'below'],
    example: 'above',
  })
  @IsIn(['above', 'below'])
  condition: 'above' | 'below';

  @ApiProperty({
    description: 'The email address to receive the alert',
    example: 'user@example.com',
  })
  @IsEmail()
  userEmail: string;
}
