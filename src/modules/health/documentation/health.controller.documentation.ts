import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

type ServiceStatus = 'up' | 'down';

interface HealthCheckInfo {
  database: ServiceStatus;
  moralisApi: ServiceStatus;
  priceTracking: ServiceStatus;
}

function generateExample(status: 'ok' | 'error', info: HealthCheckInfo) {
  const createServiceInfo = (
    serviceName: string,
    status: ServiceStatus,
    additionalInfo?: object,
  ) => ({
    [serviceName]: {
      status,
      ...(status === 'down' && { error: `${serviceName} is not operational` }),
      ...additionalInfo,
    },
  });

  const errorServices = (Object.keys(info) as Array<keyof HealthCheckInfo>)
    .filter((service) => info[service] === 'down')
    .reduce(
      (acc, service) => ({
        ...acc,
        [service]: { status: 'down' },
      }),
      {},
    );

  return {
    status,
    info: {
      ...createServiceInfo('database', info.database),
      ...createServiceInfo('moralisApi', info.moralisApi, {
        url: 'https://deep-index.moralis.io/api/v2',
      }),
      ...createServiceInfo('priceTracking', info.priceTracking, {
        lastUpdate:
          info.priceTracking === 'up' ? new Date().toISOString() : undefined,
      }),
    },
    error: errorServices,
    details: {
      database: { status: info.database },
      moralisApi: {
        status: info.moralisApi,
        url: 'https://deep-index.moralis.io/api/v2',
      },
      priceTracking: {
        status: info.priceTracking,
        lastUpdate:
          info.priceTracking === 'up' ? new Date().toISOString() : undefined,
      },
    },
  };
}

export function HealthCheckDocs() {
  return applyDecorators(
    ApiTags('health'),
    ApiOperation({
      summary: 'Check Blockchain Price Tracker health',
      description: `
        Performs a comprehensive health check of the Blockchain Price Tracker application, including:
        - Database connectivity
        - Moralis API availability
        - Price tracking service status
        
        This endpoint is essential for monitoring the application's status and ensuring that all components are functioning correctly.
      `,
    }),
    ApiResponse({
      status: 200,
      description: 'Health check successful. All systems are operational.',
      schema: {
        example: generateExample('ok', {
          database: 'up',
          moralisApi: 'up',
          priceTracking: 'up',
        }),
      },
    }),
    ApiResponse({
      status: 503,
      description:
        'Health check failed. One or more components are not operational.',
      schema: {
        example: generateExample('error', {
          database: 'up',
          moralisApi: 'down',
          priceTracking: 'up',
        }),
      },
    }),
  );
}
