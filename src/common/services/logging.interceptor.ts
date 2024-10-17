import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    this.logger.log(
      `Incoming Request: [${request.method}] ${request.url}`,
      'LoggingInterceptor',
      this.formatLogMessage(this.getRequestDetails(request)),
    );

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const statusCode = response.statusCode;
          const delay = Date.now() - now;
          this.logger.log(
            `Outgoing Response: [${request.method}] ${request.url} - Status: ${statusCode} - ${delay}ms`,
            'LoggingInterceptor',
            this.formatLogMessage({
              responseBody: this.safeStringify(responseBody),
              statusCode,
            }),
          );
        },
        error: (error) => {
          const statusCode = error.status || response.statusCode || 500;
          const delay = Date.now() - now;
          this.logger.error(
            `Error Response: [${request.method}] ${request.url} - Status: ${statusCode} - ${delay}ms`,
            'LoggingInterceptor',
            this.formatLogMessage({
              errorMessage: error.message,
              statusCode,
              stack: error.stack,
            }),
          );
        },
      }),
    );
  }

  private getRequestDetails(request: any) {
    return {
      method: request.method,
      url: request.url,
      clientIp:
        request.ip ||
        request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress,
      userAgent: request.headers['user-agent'],
      body: request.body,
      queryParams: request.query,
      pathParams: request.params,
    };
  }

  private formatLogMessage(message: any): string {
    return '\n' + this.safeStringify(message);
  }

  private safeStringify(obj: any): string {
    const cache = new Set();
    return JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular]';
          }
          cache.add(value);
        }
        return value;
      },
      2,
    );
  }
}
