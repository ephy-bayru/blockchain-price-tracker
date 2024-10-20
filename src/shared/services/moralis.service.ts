import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Observable, catchError, map, throwError } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { LoggerService } from 'src/common/services/logger.service';
import {
  TokenMetadata,
  TokenPrice,
  TokenPriceRequest,
} from '../interfaces/IToken';

@Injectable()
export class MoralisService {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://deep-index.moralis.io/api/v2.2';
  private readonly chains: Record<string, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.apiKey = this.configService.get<string>('MORALIS_API_KEY');
    this.chains = {
      ethereum: 'eth',
      polygon: 'polygon',
    };

    this.logServiceInitialization();
  }

  getTokenPrice(chain: string, address: string): Observable<TokenPrice> {
    this.logger.info('Fetching token price', 'MoralisService', {
      chain,
      address,
    });
    return this.makeRequest<TokenPrice>({
      method: 'get',
      url: `/erc20/${address}/price`,
      params: { chain: this.validateChain(chain), include: 'percent_change' },
    });
  }

  getMultipleTokenPrices(
    chain: string,
    addresses: string[],
  ): Observable<TokenPrice[]> {
    this.logger.info('Fetching multiple token prices', 'MoralisService', {
      chain,
      addressCount: addresses.length,
    });
    const tokens: TokenPriceRequest[] = addresses.map((address) => ({
      token_address: address,
    }));
    return this.makeRequest<TokenPrice[]>({
      method: 'post',
      url: '/erc20/prices',
      data: { tokens },
      params: { chain: this.validateChain(chain), include: 'percent_change' },
    });
  }

  getTokenMetadata(chain: string, address: string): Observable<TokenMetadata> {
    this.logger.info('Fetching token metadata', 'MoralisService', {
      chain,
      address,
    });
    return this.makeRequest<TokenMetadata>({
      method: 'get',
      url: `/erc20/${address}`,
      params: { chain: this.validateChain(chain) },
    });
  }

  private makeRequest<T>(config: AxiosRequestConfig): Observable<T> {
    const fullConfig: AxiosRequestConfig = {
      ...config,
      url: `${this.baseUrl}${config.url}`,
      headers: this.getHeaders(),
    };

    // Log full URL, method, headers, and request data
    this.logger.debug('Making API request', 'MoralisService', {
      method: fullConfig.method,
      url: fullConfig.url,
      headers: fullConfig.headers,
      params: fullConfig.params,
      data: fullConfig.data || null,
    });

    return this.httpService.request<T>(fullConfig).pipe(
      map((response) => {
        this.logSuccessfulRequest(config.url, response.data);
        return response.data;
      }),
      catchError(this.handleError(config.url, fullConfig)),
    );
  }

  private getHeaders(): Record<string, string> {
    return {
      'X-API-Key': this.apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
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

  private handleError(operation: string, config: AxiosRequestConfig) {
    return (error: AxiosError): Observable<never> => {
      this.logger.error(`${operation} failed`, 'MoralisService', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: {
          method: config.method,
          url: config.url,
          params: config.params,
          data: config.data,
        },
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

  private logSuccessfulRequest(url: string, data: any): void {
    this.logger.debug(`Request successful: ${url}`, 'MoralisService', {
      dataPreview: this.truncateData(data),
    });
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

  private logServiceInitialization(): void {
    this.logger.info('MoralisService initialized', 'MoralisService', {
      baseUrl: this.baseUrl,
      chains: Object.keys(this.chains),
      apiKeyPresent: !!this.apiKey,
    });
  }
}
