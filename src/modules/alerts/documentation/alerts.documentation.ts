import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { AlertResponseDto } from '../dtos/alert-response.dto';

export function AlertsControllerDocs() {
  return applyDecorators(ApiTags('alerts'));
}

export function CreateAlertDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new user alert' }),
    ApiResponse({
      status: 201,
      description: 'The alert has been successfully created.',
      type: AlertResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid input data.' }),
    ApiInternalServerErrorResponse({ description: 'Internal server error.' }),
  );
}

export function GetUserAlertsDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get user alerts' }),
    ApiQuery({ name: 'email', required: true, type: String }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Items per page (default: 10)',
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved user alerts.',
      type: [AlertResponseDto],
    }),
    ApiBadRequestResponse({ description: 'Invalid input data.' }),
    ApiInternalServerErrorResponse({ description: 'Internal server error.' }),
  );
}

export function GetAlertDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a specific user alert' }),
    ApiParam({ name: 'id', type: 'string', description: 'Alert ID' }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved the alert.',
      type: AlertResponseDto,
    }),
    ApiNotFoundResponse({ description: 'Alert not found.' }),
    ApiInternalServerErrorResponse({ description: 'Internal server error.' }),
  );
}

export function DeactivateAlertDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Deactivate a user alert' }),
    ApiParam({ name: 'id', type: 'string', description: 'Alert ID' }),
    ApiResponse({
      status: 200,
      description: 'The alert has been successfully deactivated.',
    }),
    ApiNotFoundResponse({ description: 'Alert not found.' }),
    ApiInternalServerErrorResponse({ description: 'Internal server error.' }),
  );
}
