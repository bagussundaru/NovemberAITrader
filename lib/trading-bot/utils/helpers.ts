// Trading Bot Helper Functions

import { PRECISION } from './constants';

// Number formatting and validation
export function formatPrice(price: number): number {
  return parseFloat(price.toFixed(PRECISION.PRICE_DECIMALS));
}

export function formatAmount(amount: number): number {
  return parseFloat(amount.toFixed(PRECISION.AMOUNT_DECIMALS));
}

export function formatPercentage(percentage: number): number {
  return parseFloat(percentage.toFixed(PRECISION.PERCENTAGE_DECIMALS));
}

export function isValidPrice(price: number): boolean {
  return typeof price === 'number' && price > 0 && isFinite(price);
}

export function isValidAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && isFinite(amount);
}

// Trading calculations
export function calculatePnL(entryPrice: number, currentPrice: number, amount: number, side: 'buy' | 'sell'): number {
  if (side === 'buy') {
    return (currentPrice - entryPrice) * amount;
  } else {
    return (entryPrice - currentPrice) * amount;
  }
}

export function calculatePnLPercentage(entryPrice: number, currentPrice: number, side: 'buy' | 'sell'): number {
  if (side === 'buy') {
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    return ((entryPrice - currentPrice) / entryPrice) * 100;
  }
}

export function calculateStopLossPrice(entryPrice: number, stopLossPercentage: number, side: 'buy' | 'sell'): number {
  const multiplier = stopLossPercentage / 100;
  
  if (side === 'buy') {
    return entryPrice * (1 - multiplier);
  } else {
    return entryPrice * (1 + multiplier);
  }
}

export function calculatePositionSize(accountBalance: number, riskPercentage: number, entryPrice: number, stopLossPrice: number): number {
  const riskAmount = accountBalance * (riskPercentage / 100);
  const priceRisk = Math.abs(entryPrice - stopLossPrice);
  
  if (priceRisk === 0) {
    return 0;
  }
  
  return riskAmount / priceRisk;
}

// Time and date utilities
export function getCurrentTimestamp(): number {
  return Date.now();
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function isWithinTimeRange(timestamp: number, startTime: number, endTime: number): boolean {
  return timestamp >= startTime && timestamp <= endTime;
}

// Symbol and pair utilities
export function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[-_]/g, '/');
}

export function parseSymbol(symbol: string): { base: string; quote: string } {
  const parts = symbol.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid symbol format: ${symbol}`);
  }
  
  return {
    base: parts[0],
    quote: parts[1]
  };
}

export function isValidSymbol(symbol: string): boolean {
  try {
    const { base, quote } = parseSymbol(symbol);
    return base.length > 0 && quote.length > 0;
  } catch {
    return false;
  }
}

// Validation utilities
export function validateRequired<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}

export function validateRange(value: number, min: number, max: number, fieldName: string): void {
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
}

export function validatePositive(value: number, fieldName: string): void {
  if (value <= 0) {
    throw new Error(`${fieldName} must be positive`);
  }
}

// Array and object utilities
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function isEmpty(obj: any): boolean {
  if (obj === null || obj === undefined) {
    return true;
  }
  
  if (Array.isArray(obj)) {
    return obj.length === 0;
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0;
  }
  
  return false;
}

// Retry and delay utilities
export function createExponentialBackoff(baseDelay: number = 1000, maxDelay: number = 30000): (attempt: number) => number {
  return (attempt: number) => {
    const delay = baseDelay * Math.pow(2, attempt);
    return Math.min(delay, maxDelay);
  };
}

export function createJitteredDelay(baseDelay: number, jitterFactor: number = 0.1): number {
  const jitter = baseDelay * jitterFactor * (Math.random() - 0.5);
  return baseDelay + jitter;
}

// Logging utilities
export function createLogContext(service: string, method: string, additionalContext?: Record<string, any>): Record<string, any> {
  return {
    service,
    method,
    timestamp: getCurrentTimestamp(),
    ...additionalContext
  };
}