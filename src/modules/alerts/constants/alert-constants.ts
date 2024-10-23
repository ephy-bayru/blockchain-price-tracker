export const ALERT_CONSTANTS = {
  SIGNIFICANT_PRICE_CHANGE_THRESHOLD: 3, // 3%
  SIGNIFICANT_PRICE_CHANGE_TIMEFRAME: 60, // 60 minutes
  DEFAULT_RECIPIENT_EMAIL: 'hyperhire_assignment@hyperhire.in',
  PRICE_CHECK_INTERVAL: 5, // 5 minutes
  MAX_ALERTS_PER_USER: 10,
  ALERT_EXPIRY_DAYS: 30,
};

export const ERROR_MESSAGES = {
  ALERT_NOT_FOUND: 'Alert not found',
  MAX_ALERTS_REACHED: 'Maximum number of alerts reached',
  INVALID_TOKEN: 'Invalid token address',
  INVALID_CHAIN: 'Invalid blockchain specified',
  TOKEN_NOT_FOUND: 'Token not found',
};
