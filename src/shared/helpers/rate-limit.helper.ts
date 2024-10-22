import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { RateLimitConfig } from '@/shared/interfaces/IToken';
import { LoggerService } from '@/common/services/logger.service';

@Injectable()
export class RateLimitHelper {
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(
    @Inject('RATE_LIMIT_CONFIG')
    private readonly config: RateLimitConfig,
    private readonly logger: LoggerService,
  ) {}

  async checkRateLimit(): Promise<void> {
    const now = Date.now();
    if (now - this.windowStart > this.config.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.config.maxRequests) {
      throw new HttpException(
        'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.requestCount++;
  }
}
