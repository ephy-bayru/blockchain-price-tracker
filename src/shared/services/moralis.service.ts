import {
  Injectable,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { LoggerService } from 'src/common/services/logger.service';
import Moralis from 'moralis';
import {
  TokenMetadata,
  TokenPrice,
  TokenPriceRequest,
} from '../interfaces/IToken';

@Injectable()
export class MoralisService implements OnModuleInit {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly chains: Record<string, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const moralisConfig = this.configService.get('moralis');
    this.apiKey = moralisConfig.apiKey;
    this.baseUrl = moralisConfig.baseUrl;
    this.chains = moralisConfig.chains;

    this.logServiceInitialization();
  }

  async onModuleInit() {
    await Moralis.start({ apiKey: this.apiKey });
    this.logger.info('Moralis SDK initialized', 'MoralisService');
  }

  getTokenPrice(chain: string, address: string): Observable<TokenPrice> {
    this.logger.info('Fetching token price', 'MoralisService', {
      chain,
      address,
    });
    return from(
      Moralis.EvmApi.token.getTokenPrice({
        chain: this.validateChain(chain),
        address,
        include: 'percent_change',
      }),
    ).pipe(
      map((response) => response.raw as TokenPrice),
      catchError(this.handleError('getTokenPrice')),
    );
  }

  getMultipleTokenPrices(
    chain: string,
    tokens: TokenPriceRequest[],
  ): Observable<TokenPrice[]> {
    this.logger.info('Fetching multiple token prices', 'MoralisService', {
      chain,
      tokenCount: tokens.length,
    });

    // Prepare the request and body with correct structure
    const request = {
      chain: this.validateChain(chain),
    };

    const body = {
      tokens: tokens.map((token) => ({
        tokenAddress: token.address,
        exchange: token.exchange,
        toBlock: token.to_block,
        toJSON: () => ({
          tokenAddress: token.address,
          exchange: token.exchange,
          toBlock: token.to_block,
        }),
      })),
      include: 'percent_change',
      toJSON: () => ({
        tokens: tokens.map((token) => ({
          tokenAddress: token.address,
          exchange: token.exchange,
          toBlock: token.to_block,
        })),
        include: 'percent_change',
      }),
    };

    return from(
      Moralis.EvmApi.token.getMultipleTokenPrices(request, body),
    ).pipe(
      map((response) => response.raw as TokenPrice[]),
      catchError(this.handleError('getMultipleTokenPrices')),
    );
  }

  getTokenMetadata(
    chain: string,
    addresses: string[],
  ): Observable<TokenMetadata[]> {
    this.logger.info('Fetching token metadata', 'MoralisService', {
      chain,
      addresses,
    });
    return from(
      Moralis.EvmApi.token.getTokenMetadata({
        addresses,
        chain: this.validateChain(chain),
      }),
    ).pipe(
      map((response) => response.raw as TokenMetadata[]),
      catchError(this.handleError('getTokenMetadata')),
    );
  }

  private validateChain(chain: string): string {
    const chainId = this.chains[chain];
    if (!chainId) {
      this.logger.error('Unsupported chain', 'MoralisService', { chain });
      throw new HttpException(
        `Unsupported chain: ${chain}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return chainId;
  }

  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      this.logger.error(`${operation} failed`, 'MoralisService', {
        error: error.message,
        stack: error.stack,
      });
      return throwError(
        () =>
          new HttpException(
            'An error occurred while fetching data from Moralis',
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
      );
    };
  }

  private logServiceInitialization(): void {
    this.logger.info('MoralisService initialized', 'MoralisService', {
      baseUrl: this.baseUrl,
      chains: Object.keys(this.chains),
      apiKeyPresent: !!this.apiKey,
    });
  }

  testApiConnection(): Observable<any> {
    this.logger.info('Starting API connection test', 'MoralisService');
    return this.getTokenPrice(
      'ethereum',
      '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
    ).pipe(
      map((response) => {
        this.logger.info('API connection test successful', 'MoralisService', {
          data: this.truncateData(response),
        });
        return response;
      }),
      catchError((error: any) => {
        this.logger.error('API connection test failed', 'MoralisService', {
          error: error.message,
          stack: error.stack,
        });
        return throwError(
          () =>
            new HttpException(
              'API connection test failed',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
        );
      }),
    );
  }

  private truncateData(data: any): any {
    if (Array.isArray(data)) {
      return { arrayLength: data.length, sample: data.slice(0, 2) };
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).reduce((acc, key) => {
        acc[key] = this.truncateValue(data[key]);
        return acc;
      }, {});
    }
    return this.truncateValue(data);
  }

  private truncateValue(value: any): any {
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 47) + '...';
    }
    return value;
  }
}
