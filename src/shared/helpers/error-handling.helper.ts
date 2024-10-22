import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { LoggerService } from '@/common/services/logger.service';
import { MoralisError } from '@/shared/interfaces/IToken';

@Injectable()
export class ErrorHandlingHelper {
  constructor(private readonly logger: LoggerService) {}

  handleError(operation: string, error: any): Observable<never> {
    const formattedError = this.formatError(error);
    this.logger.error(`${operation} failed`, 'MoralisService', {
      error: formattedError,
      operation,
    });

    if (error.response?.status === HttpStatus.TOO_MANY_REQUESTS) {
      return throwError(
        () =>
          new HttpException(
            'Rate limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          ),
      );
    }

    const moralisError = error as MoralisError;
    if (moralisError.code) {
      const errorMap: Record<string, HttpException> = {
        C0005: new HttpException(
          'Invalid address format',
          HttpStatus.BAD_REQUEST,
        ),
        C0006: new HttpException(
          'Invalid chain format',
          HttpStatus.BAD_REQUEST,
        ),
      };
      if (errorMap[moralisError.code]) {
        return throwError(() => errorMap[moralisError.code]);
      }
    }

    return throwError(
      () =>
        new HttpException(
          'An error occurred while fetching data from Moralis',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
    );
  }

  private formatError(error: any): object {
    return {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
}
