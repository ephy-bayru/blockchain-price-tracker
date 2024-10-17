import { registerAs } from '@nestjs/config';
import { ThrottlerOptions } from '@nestjs/throttler';

export default registerAs(
  'throttler',
  (): ThrottlerOptions => ({
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 10,
  }),
);
