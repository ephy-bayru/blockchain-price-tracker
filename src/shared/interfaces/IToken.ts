export interface TokenPrice {
  tokenName: string;
  tokenSymbol: string;
  tokenLogo: string;
  tokenDecimals: string;
  nativePrice: {
    value: string;
    decimals: number;
    name: string;
    symbol: string;
    address: string;
  };
  usdPrice: number;
  usdPriceFormatted: string;
  exchangeName: string;
  exchangeAddress: string;
  tokenAddress: string;
  priceLastChangedAtBlock: string;
  blockTimestamp: string;
  possibleSpam: boolean;
  verifiedContract: boolean;
  pairAddress: string;
  pairTotalLiquidityUsd: string;
  '1hrPercentChange'?: string;
  securityScore: number;
}

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: string | null;
  logo?: string;
  logo_hash?: string;
  thumbnail?: string;
  block_number?: string;
  validated?: boolean;
}

export interface TokenPriceRequest {
  token_address: string;
  exchange?: string;
  to_block?: string;
}
