import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LoggerService } from '../services/logger.service';
import { ConfigService } from '@nestjs/config';
import { EntityNotFoundError } from 'typeorm/error/EntityNotFoundError';
import { QueryFailedError } from 'typeorm';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string[];
  error: string;
  stack?: string;
}

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.createErrorResponse(exception, request);

    this.logError(request, errorResponse);
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private createErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    if (exception instanceof HttpException) {
      return this.createHttpExceptionResponse(exception, request);
    } else if (exception instanceof EntityNotFoundError) {
      return this.createEntityNotFoundErrorResponse(exception, request);
    } else if (exception instanceof QueryFailedError) {
      return this.createQueryFailedErrorResponse(exception, request);
    } else {
      return this.createInternalServerErrorResponse(exception, request);
    }
  }

  private createHttpExceptionResponse(
    exception: HttpException,
    request: Request,
  ): ErrorResponse {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const message = this.extractMessage(response);

    return this.createBaseErrorResponse(
      status,
      request,
      message,
      exception.name,
      exception,
    );
  }

  private createEntityNotFoundErrorResponse(
    exception: EntityNotFoundError,
    request: Request,
  ): ErrorResponse {
    return this.createBaseErrorResponse(
      HttpStatus.NOT_FOUND,
      request,
      ['Entity not found'],
      exception.name,
      exception,
    );
  }

  private createQueryFailedErrorResponse(
    exception: QueryFailedError,
    request: Request,
  ): ErrorResponse {
    return this.createBaseErrorResponse(
      HttpStatus.BAD_REQUEST,
      request,
      ['Database query failed'],
      exception.name,
      exception,
    );
  }

  private createInternalServerErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const errorName =
      exception instanceof Error ? exception.name : 'UnknownError';
    return this.createBaseErrorResponse(
      HttpStatus.INTERNAL_SERVER_ERROR,
      request,
      ['Internal server error'],
      errorName,
      exception,
    );
  }

  private createBaseErrorResponse(
    statusCode: number,
    request: Request,
    message: string[],
    error: string,
    exception: unknown,
  ): ErrorResponse {
    return {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      ...this.includeStackTrace(exception),
    };
  }

  private extractMessage(response: string | object): string[] {
    if (typeof response === 'string') {
      return [response];
    }
    const message = (response as any).message;
    return Array.isArray(message) ? message : [message || 'Unknown error'];
  }

  private includeStackTrace(exception: unknown): { stack?: string } {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    if (!isProduction && exception instanceof Error) {
      return { stack: exception.stack };
    }
    return {};
  }

  private logError(request: Request, errorResponse: ErrorResponse): void {
    this.logger.error(
      `Error on ${request.method} ${request.url}`,
      'GlobalExceptionFilter',
      {
        ...errorResponse,
        headers: request.headers,
        body: request.body,
      },
    );
  }
}
