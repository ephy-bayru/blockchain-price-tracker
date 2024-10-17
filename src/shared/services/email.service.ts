import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { format } from 'date-fns';
import { LoggerService } from 'src/common/services/logger.service';

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private readonly templates: Map<string, handlebars.TemplateDelegate> =
    new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.initializeTransporter();
    await this.loadTemplates();
  }

  private async initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<boolean>('email.secure'),
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.password'),
      },
    });

    try {
      await this.transporter.verify();
      this.logger.info(
        'Email transporter verified successfully',
        'EmailService',
      );
    } catch (error) {
      this.logger.error(
        'Email transporter verification failed',
        'EmailService',
        error,
      );
      throw error;
    }
  }

  private async loadTemplates() {
    const templateNames = [
      'priceAlert',
      'dailySummary',
      'newTokenListing',
      'swapRateInfo',
    ];

    for (const name of templateNames) {
      const templatePath = path.join(
        __dirname,
        '..',
        'templates',
        `${name}.hbs`,
      );
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      this.templates.set(name, handlebars.compile(templateSource));
    }

    // Register helpers
    handlebars.registerHelper(
      'formatNumber',
      (number: number, decimals: number) => number.toFixed(decimals),
    );
    handlebars.registerHelper(
      'formatDate',
      (date: Date, formatString: string) => {
        try {
          return format(date, formatString);
        } catch (error) {
          this.logger.error(
            `Failed to format date: ${error.message}`,
            'EmailService',
            { date, formatString },
          );
          return 'Invalid Date';
        }
      },
    );

    this.logger.info('Email templates loaded successfully', 'EmailService');
  }

  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    context: any,
  ) {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      const html = template(context);

      const mailOptions = {
        from: this.configService.get<string>('email.from'),
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.info(`Email sent: ${info.messageId}`, 'EmailService', {
        templateName,
        to,
      });
      return info;
    } catch (error) {
      this.logger.error(
        `Failed to send email: ${error.message}`,
        'EmailService',
        { error, templateName, to },
      );
      throw error;
    }
  }

  async sendPriceAlert(to: string, context: any) {
    return this.sendEmail(
      to,
      `Price Alert: ${context.tokenName}`,
      'priceAlert',
      context,
    );
  }

  async sendDailySummary(to: string, context: any) {
    return this.sendEmail(
      to,
      'Daily Cryptocurrency Price Summary',
      'dailySummary',
      context,
    );
  }

  async sendNewTokenListing(to: string, context: any) {
    return this.sendEmail(
      to,
      `New Token Listed: ${context.tokenName}`,
      'newTokenListing',
      context,
    );
  }

  async sendSwapRateInfo(to: string, context: any) {
    return this.sendEmail(
      to,
      `Swap Rate Information: ${context.fromToken} to ${context.toToken}`,
      'swapRateInfo',
      context,
    );
  }
}
