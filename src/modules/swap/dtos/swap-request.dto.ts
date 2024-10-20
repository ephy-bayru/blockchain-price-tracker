import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SwapRequestDto {
  @ApiProperty({
    description: 'The amount of Ethereum to swap',
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}
