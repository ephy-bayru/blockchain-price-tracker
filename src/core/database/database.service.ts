import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseLoggerService } from '../services/database-logger.service';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly context = 'DatabaseService';
  private isClosed = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: DatabaseLoggerService,
  ) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    if (this.isClosed) {
      this.logger.warn('Database connection is already closed.', this.context);
      return;
    }

    this.logger.log('Shutting down database connections...', this.context, {
      signal,
    });

    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        this.logger.log(
          'Database connections closed successfully.',
          this.context,
        );
      } else {
        this.logger.warn(
          'Database connection was already closed.',
          this.context,
        );
      }
    } catch (error) {
      this.logger.error('Error closing database connections:', this.context, {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isClosed = true;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', this.context, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
