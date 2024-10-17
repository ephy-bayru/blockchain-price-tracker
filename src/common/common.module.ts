import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerService } from './services/logger.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LoggerService,
      useFactory: (configService: ConfigService) =>
        new LoggerService(configService),
      inject: [ConfigService],
    },
  ],
  exports: [LoggerService],
})
export class CommonModule {}
