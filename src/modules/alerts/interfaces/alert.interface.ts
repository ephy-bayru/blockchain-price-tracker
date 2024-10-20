import { ChainEnum } from '../../price-tracker/enums/chain.enum';

export interface IAlert {
  id: string;
  tokenAddress: string;
  chain: ChainEnum;
  targetPrice: number;
  condition: 'above' | 'below';
  userEmail: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISignificantPriceAlert {
  id: string;
  chain: ChainEnum;
  thresholdPercentage: number;
  timeFrame: number;
  recipientEmail: string;
  lastCheckedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
