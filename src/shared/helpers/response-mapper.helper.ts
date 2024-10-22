import { Injectable } from '@nestjs/common';
import {
  GetTokenPriceResponseAdapter,
  GetTokenMetadataResponseAdapter,
} from '@moralisweb3/common-evm-utils';
import { TokenPrice, TokenMetadata } from '@/shared/interfaces/IToken';

@Injectable()
export class ResponseMapperHelper {
  mapTokenPriceResponse(response: GetTokenPriceResponseAdapter): TokenPrice {
    const jsonResponse = response.toJSON();
    return {
      tokenAddress: jsonResponse.tokenAddress,
      usdPrice: jsonResponse.usdPrice,
      tokenName: jsonResponse.tokenName,
      tokenSymbol: jsonResponse.tokenSymbol,
      tokenDecimals: jsonResponse.tokenDecimals,
      nativePrice: jsonResponse.nativePrice,
      '24hrPercentChange': jsonResponse['24hrPercentChange'],
      exchangeAddress: jsonResponse.exchangeAddress,
      exchangeName: jsonResponse.exchangeName,
    } as TokenPrice;
  }

  mapTokenMetadataResponse(
    response: GetTokenMetadataResponseAdapter,
  ): TokenMetadata {
    const jsonResponse = response.toJSON()[0];
    return {
      address: jsonResponse.address,
      name: jsonResponse.name,
      symbol: jsonResponse.symbol,
      decimals: jsonResponse.decimals,
      logo: jsonResponse.logo,
      logo_hash: jsonResponse.logo_hash,
      thumbnail: jsonResponse.thumbnail,
      block_number: jsonResponse.block_number,
      validated: jsonResponse.validated,
      created_at: jsonResponse.created_at,
      possible_spam: jsonResponse.possible_spam,
      verified_contract: jsonResponse.verified_contract,
    } as TokenMetadata;
  }
}
