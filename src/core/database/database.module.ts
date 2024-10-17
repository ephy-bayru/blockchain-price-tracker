import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { DatabaseLoggerService } from '../services/database-logger.service';
import { typeormConfig } from 'src/config/typeorm.config';
import { LoggerService } from 'src/common/services/logger.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, DatabaseLoggerService, LoggerService],
      useFactory: async (
        configService: ConfigService,
        databaseLoggerService: DatabaseLoggerService,
        loggerService: LoggerService,
      ): Promise<TypeOrmModuleOptions> => {
        try {
          const typeormOptions = await typeormConfig(
            configService,
            databaseLoggerService,
          );

          // Consolidated logging
          loggerService.log(
            'TypeORM configuration initialized',
            'DatabaseModule',
            {
              type: typeormOptions.type,
              database: typeormOptions.database,
              entities: Array.isArray(typeormOptions.entities)
                ? typeormOptions.entities.length
                : 'Function or string',
              migrations: Array.isArray(typeormOptions.migrations)
                ? typeormOptions.migrations.length
                : 'Function or string',
              synchronize: typeormOptions.synchronize,
              migrationsRun: typeormOptions.migrationsRun,
              logging: !!typeormOptions.logging,
              ssl: !!(typeormOptions as any).ssl,
              retryAttempts: (typeormOptions as any).retryAttempts,
              retryDelay: (typeormOptions as any).retryDelay,
              connectionTimeout: (typeormOptions as any).extra
                ?.connectionTimeoutMillis,
            },
          );

          return typeormOptions;
        } catch (error) {
          loggerService.error('Error configuring TypeORM', 'DatabaseModule', {
            error: error instanceof Error ? error.message : String(error),
          });
          throw new Error('Failed to configure TypeORM');
        }
      },
    }),
  ],
  providers: [DatabaseService, DatabaseLoggerService],
  exports: [DatabaseService, DatabaseLoggerService],
})
export class DatabaseModule {}
