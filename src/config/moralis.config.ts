import { registerAs } from '@nestjs/config';

export interface MoralisConfigType {
  apiKey: string;
  baseUrl: string;
  chains: {
    ethereum: string;
    polygon: string;
  };
  nativeTokens: Record<string, string>;
  trackedTokens: Record<string, string[]>;
  api: {
    rateLimitConfig: {
      maxRequests: number;
      windowMs: number;
    };
    retryConfig: {
      maxRetries: number;
      baseDelay: number;
      maxDelay: number;
      timeout: number;
    };
  };
}

export default registerAs('moralis', (): MoralisConfigType => {
  // Parse JSON strings from env
  const nativeTokens = JSON.parse(process.env.NATIVE_TOKENS || '{}');
  const trackedTokens = JSON.parse(process.env.TRACKED_TOKENS || '{}');

  return {
    apiKey: process.env.MORALIS_API_KEY,
    baseUrl:
      process.env.MORALIS_BASE_URL || 'https://deep-index.moralis.io/api/v2.2',
    chains: {
      ethereum: '0x1',
      polygon: '0x89',
    },
    nativeTokens,
    trackedTokens,
    api: {
      rateLimitConfig: {
        maxRequests:
          parseInt(process.env.MORALIS_RATE_LIMIT_MAX_REQUESTS, 10) || 100,
        windowMs:
          parseInt(process.env.MORALIS_RATE_LIMIT_WINDOW_MS, 10) || 60000,
      },
      retryConfig: {
        maxRetries: parseInt(process.env.MORALIS_RETRY_MAX_ATTEMPTS, 10) || 3,
        baseDelay: parseInt(process.env.MORALIS_RETRY_BASE_DELAY, 10) || 1000,
        maxDelay: parseInt(process.env.MORALIS_RETRY_MAX_DELAY, 10) || 5000,
        timeout: parseInt(process.env.MORALIS_REQUEST_TIMEOUT, 10) || 10000,
      },
    },
  };
});
