import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import moralisConfig from '../config/moralis.config';
import { MoralisService } from './services/moralis.service';
import { EmailService } from './services/email.service';

@Module({
  imports: [HttpModule, ConfigModule.forFeature(moralisConfig)],
  providers: [MoralisService, EmailService],
  exports: [MoralisService, EmailService],
})
export class SharedModule {}
