// Logging Configuration and Setup
// Add logging configuration and monitoring setup
// Requirements: 7.3, 7.4

import winston from 'winston';
import { getLoggingConfig } from './environment';

export interface LoggingConfig {
  level: string;
  format: 'json' | 'text';
  filePath?: string;
  enableConsole: boolean;
}

export class LoggingManager {
  private static instance: LoggingManager;
  private logger: winston.Logger;
  private config: LoggingConfig;

  private constructor() {
    this.config = getLoggingConfig();
    this.logger = this.createLogger();
  }

  public static getInstance(): LoggingManager {
    if (!LoggingManager.instance) {
      LoggingManager.instance = new LoggingManager();
    }
    return LoggingManager.instance;
  }

  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: this.config.format === 'json' 
            ? winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
              )
            : winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                })
              )
        })
      );
    }

    // File transport
    if (this.config.filePath) {
      transports.push(
        new winston.transports.File({
          filename: this.config.filePath,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
      );
    }

    // Error file transport
    if (this.config.filePath) {
      const errorFilePath = this.config.filePath.replace('.log', '-error.log');
      transports.push(
        new winston.transports.File({
          filename: errorFilePath,
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      transports,
      exitOnError: false,
      // Handle uncaught exceptions and rejections
      exceptionHandlers: this.config.filePath ? [
        new winston.transports.File({ 
          filename: this.config.filePath.replace('.log', '-exceptions.log') 
        })
      ] : [],
      rejectionHandlers: this.config.filePath ? [
        new winston.transports.File({ 
          filename: this.config.filePath.replace('.log', '-rejections.log') 
        })
      ] : []
    });
  }

  public getLogger(): winston.Logger {
    return this.logger;
  }

  // Convenience methods
  public error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  // Trading-specific logging methods
  public logTrade(action: string, symbol: string, amount: number, price: number, meta?: any): void {
    this.logger.info('Trade executed', {
      action,
      symbol,
      amount,
      price,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  public logSignal(signal: any): void {
    this.logger.info('Trading signal received', {
      symbol: signal.symbol,
      action: signal.action,
      confidence: signal.confidence,
      timestamp: new Date().toISOString()
    });
  }

  public logError(error: Error, context: string, meta?: any): void {
    this.logger.error(`Error in ${context}`, {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  public logSystemEvent(event: string, data?: any): void {
    this.logger.info('System event', {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  public logPerformanceMetric(metric: string, value: number, unit?: string): void {
    this.logger.info('Performance metric', {
      metric,
      value,
      unit,
      timestamp: new Date().toISOString()
    });
  }

  // Update log level dynamically
  public setLogLevel(level: string): void {
    this.logger.level = level;
    this.config.level = level;
    this.logger.info(`Log level changed to ${level}`);
  }

  // Flush logs (useful for graceful shutdown)
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}

// Export singleton instance
export const loggingManager = LoggingManager.getInstance();
export const logger = loggingManager.getLogger();

// Export convenience functions
export const logTrade = (action: string, symbol: string, amount: number, price: number, meta?: any) => 
  loggingManager.logTrade(action, symbol, amount, price, meta);

export const logSignal = (signal: any) => 
  loggingManager.logSignal(signal);

export const logError = (error: Error, context: string, meta?: any) => 
  loggingManager.logError(error, context, meta);

export const logSystemEvent = (event: string, data?: any) => 
  loggingManager.logSystemEvent(event, data);

export const logPerformanceMetric = (metric: string, value: number, unit?: string) => 
  loggingManager.logPerformanceMetric(metric, value, unit);

// Setup global error handlers
process.on('uncaughtException', (error) => {
  loggingManager.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  loggingManager.error('Unhandled Rejection', { reason, promise });
});

// Log startup
loggingManager.info('Logging system initialized', {
  level: loggingManager.getLogger().level,
  transports: loggingManager.getLogger().transports.length
});