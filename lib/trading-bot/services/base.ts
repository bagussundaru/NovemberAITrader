// Base Service Classes and Utilities

import { ErrorHandler, NebiusError, GateError, NetworkError } from '../types';

export abstract class BaseService {
  protected config: any;
  protected errorHandler: ErrorHandler;

  constructor(config: any, errorHandler: ErrorHandler) {
    this.config = config;
    this.errorHandler = errorHandler;
  }

  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected validateRequired(value: any, fieldName: string): void {
    if (!value) {
      throw new Error(`${fieldName} is required`);
    }
  }
}

export class DefaultErrorHandler implements ErrorHandler {
  handleNebiusError(error: NebiusError): void {
    console.error(`Nebius AI Error [${error.code}]:`, error.message);
    if (error.statusCode) {
      console.error(`Status Code: ${error.statusCode}`);
    }
  }

  handleGateError(error: GateError): void {
    console.error(`Gate.io Error [${error.code}]:`, error.message);
    if (error.statusCode) {
      console.error(`Status Code: ${error.statusCode}`);
    }
  }

  handleNetworkError(error: NetworkError): void {
    console.error(`Network Error [${error.code}]:`, error.message);
    console.error(`Retryable: ${error.retryable}`);
  }

  logError(error: Error, context: string): void {
    console.error(`Error in ${context}:`, error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Circuit Breaker Pattern Implementation
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }
}

// Rate Limiter Implementation
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async checkLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(now);
  }
}