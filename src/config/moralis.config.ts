import { registerAs } from '@nestjs/config';

export default registerAs('moralis', () => ({
  apiKey: process.env.MORALIS_API_KEY,
  baseUrl:
    process.env.MORALIS_BASE_URL || 'https://deep-index.moralis.io/api/v2.2',
  chains: {
    ethereum: 'eth',
    polygon: 'polygon',
  },
  nativeTokens: {
    ethereum:
      process.env.ETH_ADDRESS || '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    polygon:
      process.env.MATIC_ADDRESS || '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
  },
}));
