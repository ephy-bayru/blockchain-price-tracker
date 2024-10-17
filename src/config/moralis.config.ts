import { registerAs } from '@nestjs/config';

export default registerAs('moralis', () => ({
  apiKey: process.env.MORALIS_API_KEY,
  baseUrl:
    process.env.MORALIS_BASE_URL || 'https://deep-index.moralis.io/api/v2',
  chains: {
    ethereum: '0x1',
    polygon: '0x89',
  },
}));
