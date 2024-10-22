import { MoralisConfigType } from '@/config/moralis.config';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EvmChain, EvmAddress } from '@moralisweb3/common-evm-utils';
import { LoggerService } from '@/common/services/logger.service';

@Injectable()
export class ChainUtilsHelper {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  getChainHex(chain: string): string {
    try {
      const config = this.configService.get<MoralisConfigType>('moralis');
      const chainId = config.chains[chain.toLowerCase()];

      if (!chainId) {
        throw new HttpException(
          `Unsupported chain: ${chain}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return EvmChain.create(chainId).hex;
    } catch (error) {
      this.logger.error('Error getting chain hex', 'ChainUtilsHelper', {
        chain,
        error,
      });
      throw error;
    }
  }

  formatAddress(address: string): string {
    try {
      if (!address) {
        throw new HttpException(
          'Address cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Normalize the address format
      const normalizedAddress = address.toLowerCase();

      // Basic format validation
      if (!/^0x[a-f0-9]{40}$/i.test(normalizedAddress)) {
        throw new HttpException(
          `Invalid address format: ${address}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return EvmAddress.create(normalizedAddress).checksum;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error formatting address', 'ChainUtilsHelper', {
        address,
        error,
      });
      throw new HttpException(
        `Invalid address format: ${address}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  getNativeToken(chain: string): string {
    try {
      const config = this.configService.get<MoralisConfigType>('moralis');
      const address = config.nativeTokens[chain.toLowerCase()];

      if (!address) {
        throw new HttpException(
          `Native token not found for chain: ${chain}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.formatAddress(address);
    } catch (error) {
      this.logger.error('Error getting native token', 'ChainUtilsHelper', {
        chain,
        error,
      });
      throw error;
    }
  }
}
