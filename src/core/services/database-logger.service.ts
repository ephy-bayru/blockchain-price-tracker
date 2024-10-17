import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerOptions, LogLevel } from 'typeorm';

export type DatabaseLogLevel = 'error' | 'warn' | 'info' | 'log' | 'debug';

@Injectable()
export class DatabaseLoggerService {
  private readonly validOptions: readonly LogLevel[] = [
    'query',
    'error',
    'schema',
    'warn',
    'info',
    'log',
    'migration',
  ] as const;

  private currentLogLevel: DatabaseLogLevel;

  constructor(private readonly configService: ConfigService) {
    this.currentLogLevel = this.determineLogLevel();
  }

  private determineLogLevel(): DatabaseLogLevel {
    return this.configService.get<DatabaseLogLevel>('DB_LOG_LEVEL', 'info');
  }

  public determineDatabaseLoggingOptions(): LoggerOptions {
    const loggingConfig = this.configService.get<string>('DB_LOGGING', 'false');

    if (typeof loggingConfig !== 'string') {
      this.warn(
        'DB_LOGGING must be a string. Logging is disabled.',
        'DatabaseLoggerService',
      );
      return false;
    }

    const normalizedConfig = loggingConfig.toLowerCase();

    if (normalizedConfig === 'false') {
      return false;
    }

    if (['true', 'all'].includes(normalizedConfig)) {
      return 'all';
    }

    const options = normalizedConfig.split(',').map((opt) => opt.trim());
    const filteredOptions = options.filter((opt): opt is LogLevel =>
      this.validOptions.includes(opt as LogLevel),
    );

    if (filteredOptions.length === 0) {
      this.warn(
        `Invalid DB_LOGGING options provided: ${loggingConfig}. Logging is disabled.`,
        'DatabaseLoggerService',
      );
      return false;
    }

    return filteredOptions;
  }

  private logToConsole(
    level: DatabaseLogLevel,
    message: string,
    context?: string,
    meta?: any,
  ): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} [${level.toUpperCase()}] [${
      context || 'App'
    }] ${message}`;
    console.log(formattedMessage);
    if (meta) {
      console.log(JSON.stringify(meta, null, 2));
    }
  }

  error(message: string, context?: string, meta?: any): void {
    this.logToConsole('error', message, context, meta);
  }

  warn(message: string, context?: string, meta?: any): void {
    this.logToConsole('warn', message, context, meta);
  }

  log(message: string, context?: string, meta?: any): void {
    this.logToConsole('log', message, context, meta);
  }

  debug(message: string, context?: string, meta?: any): void {
    this.logToConsole('debug', message, context, meta);
  }

  setLogLevel(level: DatabaseLogLevel): void {
    this.currentLogLevel = level;
    this.log(
      `Database log level changed to: ${level.toUpperCase()}`,
      'DatabaseLoggerService',
    );
  }
}
