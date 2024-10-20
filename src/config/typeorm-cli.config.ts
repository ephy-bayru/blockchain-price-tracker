import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  entities: [path.join(__dirname, '..', 'modules', '**', '*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  synchronize: false,
  migrationsRun: true,
  logging: ['error', 'warn', 'info', 'log', 'migration'],
  ssl: {
    rejectUnauthorized: false,
  },
  extra: {
    connectionTimeoutMillis: configService.get<number>(
      'DB_CONNECTION_TIMEOUT',
      30000,
    ),
    max: 1,
  },
});
