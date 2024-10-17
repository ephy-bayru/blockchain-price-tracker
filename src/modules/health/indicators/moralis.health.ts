import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/common/services/logger.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MoralisHealthIndicator extends HealthIndicator {
  constructor(
    private http: HttpService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    super();
  }

  async checkMoralisApiConnection(): Promise<HealthIndicatorResult> {
    const moralisApiUrl = this.configService.get<string>('MORALIS_API_URL');
    const moralisApiKey = this.configService.get<string>('MORALIS_API_KEY');

    try {
      await firstValueFrom(
        this.http.get(moralisApiUrl, {
          headers: { 'X-API-Key': moralisApiKey },
        }),
      );

      return this.getStatus('moralisApi', true, { url: moralisApiUrl });
    } catch (error) {
      this.logger.error(
        'Moralis API health check failed',
        'MoralisHealthIndicator',
        { error },
      );
      return this.getStatus('moralisApi', false, {
        url: moralisApiUrl,
        error: 'Unable to connect to Moralis API',
      });
    }
  }
}
