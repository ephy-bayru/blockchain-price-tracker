import { Inject, Injectable } from '@nestjs/common';
import { Observable, timer, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { LoggerService } from '@/common/services/logger.service';
import { RetryConfig } from '@/shared/interfaces/IToken';

@Injectable()
export class RetryHelper {
  constructor(
    @Inject('RETRY_CONFIG')
    private readonly config: RetryConfig,
    private readonly logger: LoggerService,
  ) {}

  createRetryStrategy() {
    return (errors: Observable<any>) =>
      errors.pipe(
        mergeMap((error, index) => {
          const retryAttempt = index + 1;

          if (retryAttempt > this.config.maxRetries) {
            return throwError(() => error);
          }

          const retryAfter = error?.response?.headers?.['retry-after'];
          if (error?.response?.status === 429 && retryAfter) {
            const delayMs = parseInt(retryAfter, 10) * 1000;
            this.logger.debug(
              `Rate limit hit, retrying after ${delayMs}ms`,
              'RetryHelper',
            );
            return timer(delayMs);
          }

          const delayMs = Math.min(
            this.config.baseDelay * Math.pow(2, index),
            this.config.maxDelay,
          );

          this.logger.debug(
            `Retry attempt ${retryAttempt}, delaying ${delayMs}ms`,
            'RetryHelper',
          );

          return timer(delayMs);
        }),
      );
  }
}
