// Trading Bot Constants and Enums

// Trading Actions
export enum TradingAction {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold'
}

// Order Status
export enum OrderStatus {
  PENDING = 'pending',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

// Position Status
export enum PositionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  CLOSING = 'closing'
}

// Position Side
export enum PositionSide {
  BUY = 'buy',
  SELL = 'sell'
}

// Alert Severity Levels
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Trading Bot States
export enum TradingBotState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  ERROR = 'error',
  EMERGENCY_STOP = 'emergency_stop'
}

// API Error Codes
export const API_ERROR_CODES = {
  AUTHENTICATION_FAILED: 'AUTH_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_SYMBOL: 'INVALID_SYMBOL',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// Default Trading Pairs
export const DEFAULT_TRADING_PAIRS = [
  'BTC/USDT',
  'ETH/USDT',
  'BNB/USDT',
  'ADA/USDT',
  'SOL/USDT'
] as const;

// Technical Indicator Periods
export const INDICATOR_PERIODS = {
  RSI: 14,
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,
  MOVING_AVERAGE: 20
} as const;

// Risk Management Limits
export const RISK_LIMITS = {
  MIN_STOP_LOSS: 0.5, // 0.5%
  MAX_STOP_LOSS: 20,  // 20%
  MIN_POSITION_SIZE: 10, // $10
  MAX_POSITION_SIZE_RATIO: 0.1, // 10% of account balance
  MAX_DAILY_TRADES: 50,
  MIN_CONFIDENCE_THRESHOLD: 0.6 // 60%
} as const;

// API Rate Limits
export const RATE_LIMITS = {
  NEBIUS_REQUESTS_PER_MINUTE: 60,
  GATE_REQUESTS_PER_SECOND: 10,
  GATE_REQUESTS_PER_MINUTE: 600
} as const;

// Timeouts and Intervals
export const TIMEOUTS = {
  API_REQUEST: 30000,        // 30 seconds
  CONNECTION_RETRY: 5000,    // 5 seconds
  MARKET_DATA_UPDATE: 1000,  // 1 second
  POSITION_UPDATE: 5000,     // 5 seconds
  HEALTH_CHECK: 30000        // 30 seconds
} as const;

// Precision Settings
export const PRECISION = {
  PRICE_DECIMALS: 8,
  AMOUNT_DECIMALS: 6,
  PERCENTAGE_DECIMALS: 2
} as const;