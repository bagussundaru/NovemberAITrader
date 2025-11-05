// Application Lifecycle Management
// Implement graceful shutdown and startup procedures
// Requirements: 7.3, 7.4, 7.5

import { EventEmitter } from 'events';
import { logger, loggingManager } from './logging';
import { DatabaseService } from '../database';

export interface LifecycleHook {
  name: string;
  priority: number; // Lower numbers run first
  startup?: () => Promise<void>;
  shutdown?: () => Promise<void>;
}

export class LifecycleManager extends EventEmitter {
  private static instance: LifecycleManager;
  private hooks: LifecycleHook[] = [];
  private isShuttingDown: boolean = false;
  private isStartingUp: boolean = false;
  private shutdownTimeout: number = 30000; // 30 seconds
  private startupTimeout: number = 60000; // 60 seconds

  private constructor() {
    super();
    this.setupSignalHandlers();
    this.registerDefaultHooks();
  }

  public static getInstance(): LifecycleManager {
    if (!LifecycleManager.instance) {
      LifecycleManager.instance = new LifecycleManager();
    }
    return LifecycleManager.instance;
  }

  /**
   * Register a lifecycle hook
   */
  public registerHook(hook: LifecycleHook): void {
    this.hooks.push(hook);
    this.hooks.sort((a, b) => a.priority - b.priority);
    logger.debug(`Registered lifecycle hook: ${hook.name} (priority: ${hook.priority})`);
  }

  /**
   * Execute startup sequence
   */
  public async startup(): Promise<void> {
    if (this.isStartingUp) {
      logger.warn('Startup already in progress');
      return;
    }

    this.isStartingUp = true;
    logger.info('Starting application startup sequence...');

    const startTime = Date.now();
    
    try {
      // Set startup timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Startup timeout exceeded')), this.startupTimeout);
      });

      // Execute startup hooks
      const startupPromise = this.executeStartupHooks();
      
      await Promise.race([startupPromise, timeoutPromise]);
      
      const duration = Date.now() - startTime;
      logger.info(`Application startup completed successfully in ${duration}ms`);
      
      this.emit('startup:complete', { duration });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Application startup failed after ${duration}ms`, { error });
      
      this.emit('startup:failed', { error, duration });
      throw error;
      
    } finally {
      this.isStartingUp = false;
    }
  }

  /**
   * Execute graceful shutdown sequence
   */
  public async shutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Starting graceful shutdown sequence${signal ? ` (signal: ${signal})` : ''}...`);

    const startTime = Date.now();
    
    try {
      // Set shutdown timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Shutdown timeout exceeded')), this.shutdownTimeout);
      });

      // Execute shutdown hooks
      const shutdownPromise = this.executeShutdownHooks();
      
      await Promise.race([shutdownPromise, timeoutPromise]);
      
      const duration = Date.now() - startTime;
      logger.info(`Graceful shutdown completed successfully in ${duration}ms`);
      
      this.emit('shutdown:complete', { duration, signal });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Graceful shutdown failed after ${duration}ms`, { error });
      
      this.emit('shutdown:failed', { error, duration, signal });
      
    } finally {
      // Flush logs before exit
      await loggingManager.flush();
      
      // Force exit if needed
      if (signal) {
        process.exit(signal === 'SIGTERM' ? 0 : 1);
      }
    }
  }

  /**
   * Set shutdown timeout
   */
  public setShutdownTimeout(timeout: number): void {
    this.shutdownTimeout = timeout;
    logger.debug(`Shutdown timeout set to ${timeout}ms`);
  }

  /**
   * Set startup timeout
   */
  public setStartupTimeout(timeout: number): void {
    this.startupTimeout = timeout;
    logger.debug(`Startup timeout set to ${timeout}ms`);
  }

  /**
   * Check if application is shutting down
   */
  public isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Check if application is starting up
   */
  public isStartupInProgress(): boolean {
    return this.isStartingUp;
  }

  /**
   * Execute startup hooks in priority order
   */
  private async executeStartupHooks(): Promise<void> {
    for (const hook of this.hooks) {
      if (hook.startup) {
        try {
          logger.debug(`Executing startup hook: ${hook.name}`);
          const startTime = Date.now();
          
          await hook.startup();
          
          const duration = Date.now() - startTime;
          logger.debug(`Startup hook ${hook.name} completed in ${duration}ms`);
          
          this.emit('hook:startup:complete', { name: hook.name, duration });
          
        } catch (error) {
          logger.error(`Startup hook ${hook.name} failed`, { error });
          this.emit('hook:startup:failed', { name: hook.name, error });
          throw error;
        }
      }
    }
  }

  /**
   * Execute shutdown hooks in reverse priority order
   */
  private async executeShutdownHooks(): Promise<void> {
    const reversedHooks = [...this.hooks].reverse();
    
    for (const hook of reversedHooks) {
      if (hook.shutdown) {
        try {
          logger.debug(`Executing shutdown hook: ${hook.name}`);
          const startTime = Date.now();
          
          await hook.shutdown();
          
          const duration = Date.now() - startTime;
          logger.debug(`Shutdown hook ${hook.name} completed in ${duration}ms`);
          
          this.emit('hook:shutdown:complete', { name: hook.name, duration });
          
        } catch (error) {
          logger.error(`Shutdown hook ${hook.name} failed`, { error });
          this.emit('hook:shutdown:failed', { name: hook.name, error });
          // Continue with other hooks even if one fails
        }
      }
    }
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    // Handle SIGTERM (Docker, Kubernetes)
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM signal');
      this.shutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('Received SIGINT signal');
      this.shutdown('SIGINT');
    });

    // Handle SIGUSR2 (nodemon)
    process.on('SIGUSR2', () => {
      logger.info('Received SIGUSR2 signal');
      this.shutdown('SIGUSR2');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception, shutting down...', { error });
      this.shutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection, shutting down...', { reason, promise });
      this.shutdown('UNHANDLED_REJECTION');
    });
  }

  /**
   * Register default system hooks
   */
  private registerDefaultHooks(): void {
    // Database connection hook
    this.registerHook({
      name: 'database',
      priority: 10,
      startup: async () => {
        const db = DatabaseService.getInstance();
        await db.connect();
        logger.info('Database connection established');
      },
      shutdown: async () => {
        const db = DatabaseService.getInstance();
        await db.disconnect();
        logger.info('Database connection closed');
      }
    });

    // Health check hook
    this.registerHook({
      name: 'health-check',
      priority: 90,
      startup: async () => {
        logger.info('Health check system initialized');
      },
      shutdown: async () => {
        logger.info('Health check system stopped');
      }
    });

    // Metrics hook
    this.registerHook({
      name: 'metrics',
      priority: 80,
      startup: async () => {
        logger.info('Metrics collection started');
      },
      shutdown: async () => {
        logger.info('Metrics collection stopped');
      }
    });
  }
}

// Export singleton instance
export const lifecycleManager = LifecycleManager.getInstance();

// Convenience functions
export const registerLifecycleHook = (hook: LifecycleHook) => lifecycleManager.registerHook(hook);
export const startApplication = () => lifecycleManager.startup();
export const shutdownApplication = (signal?: string) => lifecycleManager.shutdown(signal);

// Trading-specific lifecycle hooks
export const registerTradingEngineHook = (tradingEngine: any) => {
  lifecycleManager.registerHook({
    name: 'trading-engine',
    priority: 50,
    startup: async () => {
      logger.info('Trading engine initialized');
      // Trading engine will be started via API calls, not automatically
    },
    shutdown: async () => {
      if (tradingEngine && typeof tradingEngine.stopTrading === 'function') {
        const state = tradingEngine.getState();
        if (state.isRunning) {
          logger.info('Stopping trading engine...');
          await tradingEngine.stopTrading();
          logger.info('Trading engine stopped');
        }
      }
    }
  });
};

export const registerMarketDataHook = (marketDataService: any) => {
  lifecycleManager.registerHook({
    name: 'market-data',
    priority: 40,
    startup: async () => {
      logger.info('Market data service initialized');
    },
    shutdown: async () => {
      if (marketDataService && typeof marketDataService.stopRealTimeCollection === 'function') {
        logger.info('Stopping market data collection...');
        await marketDataService.stopRealTimeCollection();
        logger.info('Market data collection stopped');
      }
    }
  });
};

// Log lifecycle manager initialization
logger.info('Lifecycle manager initialized');