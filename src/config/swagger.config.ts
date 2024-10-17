import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Blockchain Price Tracker API')
  .setDescription(
    `
    Welcome to the Blockchain Price Tracker API documentation.

    This API provides real-time cryptocurrency price tracking, alerts, and swap rate calculations for Ethereum and Polygon.

    ## Features
    - Automatic price tracking for Ethereum and Polygon every 5 minutes
    - Email alerts for significant price increases (>3% in 1 hour)
    - Hourly price data retrieval (last 24 hours)
    - Custom price alerts
    - Swap rate calculations between ETH and BTC


    ## Rate Limiting
    Please note that our API implements rate limiting to ensure fair usage. Refer to the response headers for rate limit information.

    ## Versions
    - Current version: 1.0
  `,
  )
  .setVersion('1.0')
  .addTag('price-tracker', 'Endpoints for retrieving cryptocurrency prices')
  .addTag('alerts', 'Endpoints for setting and managing price alerts')
  .addTag('swap', 'Endpoints for swap rate calculations')
  .addTag('health', 'Endpoint for API health check')
  .setContact(
    'API Support',
    'https://ephrembayru.com/support',
    'hyperhire_assignment@hyperhire.in',
  )
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .addServer('http://localhost:3000', 'Local development server')
  .addServer('https://api.blockchain-price-tracker.com', 'Production server')
  .build();

export const swaggerCustomOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  },
  customSiteTitle: 'Blockchain Price Tracker API Documentation',
  customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin-bottom: 50px }
      /* Removed the line hiding the title */
      .swagger-ui .info p { font-size: 16px; line-height: 1.5 }
      .swagger-ui .markdown p { margin: 0 0 10px }
      .swagger-ui .markdown h2 { font-size: 22px; margin: 30px 0 10px }
    `,
};

export const globalApiResponses = {
  '200': {
    description: 'Successful operation',
  },
  '400': {
    description: 'Bad request - The request was invalid or cannot be served',
  },
  '404': {
    description: 'Not found - The requested resource could not be found',
  },
  '429': {
    description: 'Too Many Requests - Rate limit exceeded',
  },
  '500': {
    description:
      'Internal server error - The server has encountered a situation it does not know how to handle',
  },
};

export const applySwaggerGlobalApiResponses = (document: any) => {
  for (const path in document.paths) {
    for (const method in document.paths[path]) {
      document.paths[path][method].responses = {
        ...document.paths[path][method].responses,
        ...globalApiResponses,
      };
    }
  }
  return document;
};
