import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Observable, catchError, map, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { LoggerService } from 'src/common/services/logger.service';

interface TokenPrice {
  usdPrice: number;
  address: string;
}

@Injectable()
export class MoralisService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly chains: { [key: string]: string };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.apiKey = this.configService.get<string>('moralis.apiKey');
    this.baseUrl = this.configService.get<string>('moralis.baseUrl');
    this.chains = this.configService.get<{ [key: string]: string }>(
      'moralis.chains',
    );
  }

  private getHeaders() {
    return { 'X-API-Key': this.apiKey };
  }

  private handleError(operation: string, result?: any) {
    return (error: AxiosError): Observable<any> => {
      this.logger.error(
        `${operation} failed: ${error.message}`,
        'MoralisService',
        {
          status: error.response?.status,
          data: error.response?.data,
        },
      );

      return throwError(
        () =>
          new HttpException(
            result || 'An error occurred',
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
      );
    };
  }

  private validateChain(chain: string): string {
    const chainId = this.chains[chain];
    if (!chainId) {
      throw new HttpException(
        `Unsupported chain: ${chain}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return chainId;
  }

  getTokenPrice(chain: string, address: string): Observable<number> {
    const chainId = this.validateChain(chain);
    const url = `${this.baseUrl}/erc20/${address}/price`;

    return this.httpService
      .get<TokenPrice>(url, {
        headers: this.getHeaders(),
        params: { chain: chainId },
      })
      .pipe(
        map((response) => response.data.usdPrice),
        catchError(this.handleError('getTokenPrice')),
      );
  }

  getMultipleTokenPrices(
    chain: string,
    addresses: string[],
  ): Observable<{ [address: string]: number }> {
    const chainId = this.validateChain(chain);
    const url = `${this.baseUrl}/erc20/prices`;

    return this.httpService
      .post<TokenPrice[]>(
        url,
        { addresses },
        {
          headers: this.getHeaders(),
          params: { chain: chainId },
        },
      )
      .pipe(
        map((response) =>
          response.data.reduce((acc, item) => {
            acc[item.address] = item.usdPrice;
            return acc;
          }, {}),
        ),
        catchError(this.handleError('getMultipleTokenPrices')),
      );
  }
}
