import {
  Injectable,
  LoggerService as NestLoggerService,
  Scope,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

const logLevels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'verbose'];

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private currentLogLevel: LogLevel;

  constructor(private readonly configService: ConfigService) {
    this.currentLogLevel = this.determineLogLevel();
    this.info('LoggerService initialized', 'LoggerService', {
      level: this.currentLogLevel,
    });
  }

  private determineLogLevel(): LogLevel {
    return this.configService.get<LogLevel>('logger.level', 'info');
  }

  private shouldLog(level: LogLevel): boolean {
    return logLevels.indexOf(level) <= logLevels.indexOf(this.currentLogLevel);
  }

  private colorize(text: string, colorCode: number): string {
    return `\x1b[${colorCode}m${text}\x1b[0m`;
  }

  private getColoredLevel(level: string): string {
    const colors: { [key: string]: number } = {
      ERROR: 91, // Bright red
      WARN: 93, // Bright yellow
      INFO: 92, // Bright green
      DEBUG: 94, // Bright blue
      VERBOSE: 95, // Bright magenta
    };
    return this.colorize(`[${level}]`, colors[level] || 97);
  }

  private logToConsole(
    level: LogLevel,
    message: string,
    context?: string,
    meta?: any,
  ): void {
    const timestamp = this.colorize(new Date().toISOString(), 90);
    const coloredLevel = this.getColoredLevel(level.toUpperCase());
    const coloredContext = this.colorize(`[${context || 'App'}]`, 36);
    const coloredMessage = this.colorize(message, 92);

    console.log(
      `${timestamp} ${coloredLevel} ${coloredContext} ${coloredMessage}`,
    );
    if (meta) {
      console.log(this.colorize(JSON.stringify(meta, null, 2), 94));
    }
  }

  private createLogMethod(level: LogLevel) {
    return (message: string, context?: string, meta?: any) => {
      if (this.shouldLog(level)) {
        this.logToConsole(level, message, context, meta);
      }
    };
  }

  error = this.createLogMethod('error');
  warn = this.createLogMethod('warn');
  log = this.createLogMethod('info');
  info = this.createLogMethod('info');
  debug = this.createLogMethod('debug');
  verbose = this.createLogMethod('verbose');

  setLogLevel(level: LogLevel): void {
    if (logLevels.includes(level)) {
      this.currentLogLevel = level;
      this.info(
        `Log level changed to: ${level.toUpperCase()}`,
        'LoggerService',
      );
    } else {
      this.warn(
        `Invalid log level: ${level}. Keeping current level: ${this.currentLogLevel}`,
        'LoggerService',
      );
    }
  }
}
