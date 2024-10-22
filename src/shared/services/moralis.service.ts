import {
  Injectable,
  OnModuleInit,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, defer, throwError } from 'rxjs';
import { map, catchError, retryWhen } from 'rxjs/operators';
import Moralis from 'moralis';
import {
  GetTokenPriceResponseAdapter,
  GetTokenMetadataResponseAdapter,
  EvmChain,
} from '@moralisweb3/common-evm-utils';
import {
  TokenPrice,
  TokenMetadata,
  MoralisError,
} from '@/shared/interfaces/IToken';
import { LoggerService } from '@/common/services/logger.service';
import { ChainUtilsHelper } from '../helpers/chain-utils.helper';
import { ErrorHandlingHelper } from '../helpers/error-handling.helper';
import { GeneralUtilsHelper } from '../helpers/general-utils.helper';
import { MoralisInitializerHelper } from '../helpers/moralis-initializer.helper';
import { RateLimitHelper } from '../helpers/rate-limit.helper';
import { ResponseMapperHelper } from '../helpers/response-mapper.helper';
import { RetryHelper } from '../helpers/retry.helper';

@Injectable()
export class MoralisService implements OnModuleInit {
  constructor(
    private readonly chainUtils: ChainUtilsHelper,
    private readonly errorHelper: ErrorHandlingHelper,
    private readonly utils: GeneralUtilsHelper,
    private readonly initializer: MoralisInitializerHelper,
    private readonly rateLimitHelper: RateLimitHelper,
    private readonly responseMapper: ResponseMapperHelper,
    private readonly retryHelper: RetryHelper,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializer.initialize();
  }

  getTokenPrice(chain: string, address: string): Observable<TokenPrice | null> {
    this.logger.debug('Fetching token price', 'MoralisService', {
      chain,
      address: this.utils.truncateAddress(address),
    });

    return defer(async () => {
      await this.rateLimitHelper.checkRateLimit();

      try {
        const chainHex = this.chainUtils.getChainHex(chain);
        const evmChain = EvmChain.create(chainHex);
        const formattedAddress = this.chainUtils.formatAddress(address);

        const response = await Moralis.EvmApi.token.getTokenPrice({
          chain: evmChain.apiHex,
          address: formattedAddress,
          include: 'percent_change',
        });

        this.logger.info('Received token price response', 'MoralisService', {
          chain,
          address: formattedAddress,
          response: response.toJSON(), // Log the full response as JSON
        });

        return response;
      } catch (error) {
        const moralisError = error as MoralisError;
        if (
          moralisError.code === 'C0006' &&
          moralisError.message.includes('No liquidity pools found')
        ) {
          this.logger.warn(
            'No liquidity pools found for token',
            'MoralisService',
            {
              chain,
              address,
            },
          );
          // Return null instead of throwing error
          return null;
        }
        throw error;
      }
    }).pipe(
      retryWhen(this.retryHelper.createRetryStrategy()),
      map((response: GetTokenPriceResponseAdapter | null) => {
        if (!response) {
          return null;
        }
        // Log the mapped response as well
        const mappedResponse =
          this.responseMapper.mapTokenPriceResponse(response);
        this.logger.info('Mapped token price response', 'MoralisService', {
          chain,
          address,
          mappedResponse,
        });
        return mappedResponse;
      }),
      catchError((error) => {
        if (error instanceof HttpException) {
          return throwError(() => error);
        }
        return this.errorHelper.handleError('getTokenPrice', error);
      }),
    );
  }

  getTokenMetadata(chain: string, address: string): Observable<TokenMetadata> {
    this.logger.debug('Fetching token metadata', 'MoralisService', {
      chain,
      address: this.utils.truncateAddress(address),
    });

    return defer(async () => {
      await this.rateLimitHelper.checkRateLimit();

      try {
        const chainHex = this.chainUtils.getChainHex(chain);
        const evmChain = EvmChain.create(chainHex);
        const formattedAddress = this.chainUtils.formatAddress(address);

        const response = await Moralis.EvmApi.token.getTokenMetadata({
          chain: evmChain.apiHex,
          addresses: [formattedAddress],
        });

        if (!response.toJSON()[0]) {
          throw new HttpException(
            'Token metadata not found',
            HttpStatus.NOT_FOUND,
          );
        }

        this.logger.info('Received token metadata response', 'MoralisService', {
          chain,
          address: formattedAddress,
          response: response.toJSON(), // Log the full response as JSON
        });

        return response;
      } catch (error) {
        const moralisError = error as MoralisError;
        if (moralisError.code === 'C0006') {
          throw new HttpException(
            'Token not found on chain',
            HttpStatus.NOT_FOUND,
          );
        }
        throw error;
      }
    }).pipe(
      retryWhen(this.retryHelper.createRetryStrategy()),
      map((response: GetTokenMetadataResponseAdapter) => {
        // Log the mapped response as well
        const mappedResponse =
          this.responseMapper.mapTokenMetadataResponse(response);
        this.logger.info('Mapped token metadata response', 'MoralisService', {
          chain,
          address,
          mappedResponse,
        });
        return mappedResponse;
      }),
      catchError((error) =>
        this.errorHelper.handleError('getTokenMetadata', error),
      ),
    );
  }
}
