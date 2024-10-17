import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DatabaseLoggerService } from 'src/core/services/database-logger.service';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import * as path from 'path';

export const typeormConfig = async (
  configService: ConfigService,
  databaseLoggerService: DatabaseLoggerService,
): Promise<TypeOrmModuleOptions> => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const sslEnabled = configService.get<boolean>('DB_SSL', false);

  const entities = [path.join(__dirname, '..', '**', '*.entity{.ts,.js}')];
  const migrations = [path.join(__dirname, '..', 'migrations', '*{.ts,.js}')];

  const connectionTimeoutMillis = configService.get<number>(
    'DB_CONNECTION_TIMEOUT',
  );
  const extra = connectionTimeoutMillis
    ? { connectionTimeoutMillis }
    : undefined;

  const config: PostgresConnectionOptions = {
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_NAME'),
    entities,
    migrations,
    synchronize: configService.get<boolean>('TYPEORM_SYNC', !isProduction),
    migrationsRun: configService.get<boolean>('TYPEORM_MIGRATIONS_RUN', true),
    logging: databaseLoggerService.determineDatabaseLoggingOptions(),
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    extra,
  };

  // Remove undefined properties
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined),
  ) as TypeOrmModuleOptions;
};
