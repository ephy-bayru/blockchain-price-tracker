import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { AlertsService } from '../services/alerts.service';
import { CreateUserAlertDto } from '../dtos/create-user-alert.dto';
import { AlertResponseDto } from '../dtos/alert-response.dto';
import { PaginationOptions } from 'src/common/interfaces/IPagination';
import { UserPriceAlert } from '../entities/user-price-alert.entity';
import {
  AlertsControllerDocs,
  CreateAlertDocs,
  GetUserAlertsDocs,
  GetAlertDocs,
  DeactivateAlertDocs,
} from '../documentation/alerts.documentation';

@AlertsControllerDocs()
@Controller({ path: 'alerts', version: '1' })
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @CreateAlertDocs()
  async createAlert(
    @Body(new ValidationPipe({ transform: true }))
    createAlertDto: CreateUserAlertDto,
  ): Promise<AlertResponseDto> {
    return this.alertsService.createUserAlert(createAlertDto);
  }

  @Get()
  @GetUserAlertsDocs()
  async getUserAlerts(
    @Query('email') userEmail: string,
    @Query('page', new ValidationPipe({ transform: true })) page: number = 1,
    @Query('limit', new ValidationPipe({ transform: true })) limit: number = 10,
  ): Promise<PaginationOptions<AlertResponseDto>> {
    const paginationOptions: PaginationOptions<UserPriceAlert> = {
      page,
      limit,
    };
    return this.alertsService.getUserAlerts(userEmail, paginationOptions);
  }

  @Get(':id')
  @GetAlertDocs()
  async getAlert(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AlertResponseDto> {
    return this.alertsService.getUserAlert(id);
  }

  @Delete(':id')
  @DeactivateAlertDocs()
  async deactivateAlert(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.alertsService.deactivateUserAlert(id);
  }
}
