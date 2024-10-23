import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/common/services/logger.service';
import { firstValueFrom } from 'rxjs';
import { MoralisConfigType } from '@/config/moralis.config';

@Injectable()
export class MoralisHealthIndicator extends HealthIndicator {
  private readonly moralisConfig: MoralisConfigType;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.moralisConfig = this.configService.get<MoralisConfigType>('moralis');
  }

  async checkMoralisApiConnection(): Promise<HealthIndicatorResult> {
    const { baseUrl, apiKey, chains } = this.moralisConfig;
    const sampleTokenAddress = '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0';
    const chain = chains.ethereum;

    try {
      await firstValueFrom(
        this.http.get(
          `${baseUrl}/erc20/${sampleTokenAddress}/price?chain=${chain}&include=percent_change`,
          {
            headers: { 'X-API-Key': apiKey },
          },
        ),
      );

      // If the request is successful, return the health check status as "up"
      return this.getStatus('moralisApi', true, { url: baseUrl });
    } catch (error) {
      this.logger.error(
        'Moralis API health check failed',
        'MoralisHealthIndicator',
        {
          message: error.message,
          response: error.response ? error.response.data : null,
          status: error.response ? error.response.status : 'No response status',
        },
      );

      return this.getStatus('moralisApi', false, {
        url: baseUrl,
        error: error.message || 'Unable to connect to Moralis API',
        statusCode: error.response ? error.response.status : null,
      });
    }
  }
}
