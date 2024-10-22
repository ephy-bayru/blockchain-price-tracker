export interface TokenPrice {
  tokenName?: string;
  tokenSymbol?: string;
  tokenLogo?: string;
  tokenDecimals?: string;
  nativePrice?: {
    value: string;
    decimals: number;
    name: string;
    symbol: string;
    address: string;
  };
  usdPrice: number;
  usdPriceFormatted?: string;
  exchangeName?: string;
  exchangeAddress?: string;
  tokenAddress: string;
  priceLastChangedAtBlock?: string;
  blockTimestamp?: string;
  possibleSpam?: boolean;
  verifiedContract?: boolean;
  pairAddress?: string;
  pairTotalLiquidityUsd?: string;
  '24hrPercentChange'?: string;
  '1hrPercentChange'?: string;
  securityScore?: number;
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
  validated?: boolean | number;
  created_at?: string;
  possible_spam?: boolean;
  verified_contract?: boolean;
}

export interface TokenPriceRequest {
  address: string;
  exchange?: string;
  to_block?: string;
}

export interface MoralisError extends Error {
  code?: string;
  status?: number;
  response?: {
    status: number;
    data: any;
    headers?: Record<string, string>;
  };
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}
