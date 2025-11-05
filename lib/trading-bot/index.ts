// Live Trading Bot - Main Module Export

// Core Types and Interfaces
export * from './types';

// Configuration Management
export * from './config';

// Base Services and Utilities
export * from './services/base';

// Utilities
export * from './utils/constants';
export * from './utils/helpers';

// Service Modules (to be implemented in subsequent tasks)
export * from './services/nebius';
export * from './services/gate';
export * from './services/risk-management';
export * from './services/market-data';

// Trading Engine Core
export * from './engine';

// Version and Metadata
export const TRADING_BOT_VERSION = '1.0.0';
export const SUPPORTED_EXCHANGES = ['gate.io'];
export const SUPPORTED_AI_PROVIDERS = ['nebius'];

// Default Configuration Constants
export const DEFAULT_CONFIG = {
  MARKET_DATA_UPDATE_INTERVAL: 1000, // 1 second
  MAX_RETRIES: 3,
  TIMEOUT: 30000, // 30 seconds
  RATE_LIMIT_REQUESTS: 10,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_TIMEOUT: 60000, // 1 minute
} as const;