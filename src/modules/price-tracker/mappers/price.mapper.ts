import { PriceResponseDto } from '../dtos/price-tracker.dto';
import { Price } from '../entities/price.entity';
import { ChainEnum } from '../enums/chain.enum';

/**
 * Maps a Price entity to a PriceResponseDto.
 * @param price The Price entity to map.
 * @returns A PriceResponseDto object.
 * @throws Error if the price or token data is invalid.
 */
export function mapPriceToResponseDto(price: Price): PriceResponseDto {
  if (!price?.token?.address) {
    throw new Error('Invalid price data: missing token information');
  }

  const { id, usdPrice, timestamp, percentageChange1h, token } = price;
  const { address, symbol, name, chain } = token;

  // Ensure the chain is a valid ChainEnum value
  if (!Object.values(ChainEnum).includes(chain as ChainEnum)) {
    throw new Error(`Invalid chain: ${chain}`);
  }

  return {
    id,
    tokenAddress: address,
    tokenSymbol: symbol ?? 'Unknown',
    tokenName: name ?? 'Unknown',
    usdPrice: Number(usdPrice),
    chain: chain as ChainEnum,
    timestamp,
    percentageChange1h:
      percentageChange1h != null ? Number(percentageChange1h) : undefined,
  };
}

/**
 * Maps an array of Price entities to an array of PriceResponseDto objects.
 * @param prices An array of Price entities to map.
 * @returns An array of PriceResponseDto objects.
 */
export function mapPricesToResponseDtos(prices: Price[]): PriceResponseDto[] {
  return prices.map(mapPriceToResponseDto);
}
