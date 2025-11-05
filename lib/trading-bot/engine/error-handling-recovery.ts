// Error Handling and Recovery System
// Implements network connectivity loss handling, API error logging and recovery,
// and system state persistence across restarts

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  ErrorHandler as IErrorHandler,
  NebiusError,
  GateError,
  NetworkError,
  TradingPosition,
  TradingSignal,
  MarketData
} from '../types';

export interface SystemState {
  isRunning: boolean;
  startTime: Date | null;
  lastSaveTime: Date;
  activePositions: TradingPosition[];
  pendingSignals: TradingSignal[];
  marketDataCache: { [symbol: string]: MarketData };
  errorCounts: { [service: string]: number };
  lastErrors: { [service: string]: Date };
  recoveryAttempts: { [service: string]: number };
}

export interface RecoveryConfig {
  maxRetryAttempts: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
  networkTimeoutMs: number;
  stateBackupInterval: number;
  errorThreshold: number;
  recoveryTimeoutMs: number;
  enableAutoRecovery: boolean;
  persistStatePath: string;
}

export interface ConnectionStatus {
  nebius: 'connected' | 'disconnected' | 'recovering';
  gate: 'connected' | 'disconnected' | 'recovering';
  network: 'online' | 'offline' | 'unstable';
  lastCheck: Date;
}

export class ErrorHandlingRecoverySystem extends EventEmitter implements IErrorHandler {
  private config: RecoveryConfig;
  private systemState: SystemState;
  private connectionStatus: ConnectionStatus;
  
  // Recovery timers and intervals
  private stateBackupTimer: NodeJS.Timeout | null = null;
  private connectionMonitorTimer: NodeJS.Timeout | null = null;
  private recoveryTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Circuit breakers for services
  private circuitBreakers: Map<string, {
    isOpen: boolean;
    failureCount: number;
    lastFailure: Date;
    nextRetryTime: Date;
  }> = new Map();

  constructor(config: Partial<RecoveryConfig> = {}) {
    super();
    
    this.config = {
      maxRetryAttempts: 5,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 60000, // 1 minute
      networkTimeoutMs: 10000, // 10 seconds
      stateBackupInterval: 30000, // 30 seconds
      errorThreshold: 10,
      recoveryTimeoutMs: 300000, // 5 minutes
      enableAutoRecovery: true,
      persistStatePath: './trading-bot-state.json',
      ...config
    };

    this.systemState = {
      isRunning: false,
      startTime: null,
      lastSaveTime: new Date(),
      activePositions: [],
      pendingSignals: [],
      marketDataCache: {},
      errorCounts: {},
      lastErrors: {},
      recoveryAttempts: {}
    };

    this.connectionStatus = {
      nebius: 'disconnected',
      gate: 'disconnected',
      network: 'offline',
      lastCheck: new Date()
    };

    this.initializeCircuitBreakers();
    this.loadPersistedState();
  }

  /**
   * Handle Nebius AI service errors with retry logic
   * Requirements: 7.1, 7.2, 7.5
   */
  handleNebiusError(error: NebiusError): void {
    const serviceName = 'nebius';
    this.logError(error, `Nebius AI Service - ${error.code}`);
    
    // Update error tracking
    this.updateErrorTracking(serviceName, error);
    
    // Update connection status
    this.connectionStatus.nebius = 'disconnected';
    
    // Handle specific error types
    switch (error.code) {
      case 'AUTH_FAILED':
        this.handleAuthenticationError(serviceName, error);
        break;
      case 'RATE_LIMIT':
        this.handleRateLimitError(serviceName, error);
        break;
      case 'NETWORK_ERROR':
        this.handleNetworkError({
          name: 'NebiusNetworkError',
          message: error.message,
          code: 'NEBIUS_NETWORK_ERROR',
          retryable: true
        });
        break;
      case 'SERVER_ERROR':
        this.handleServerError(serviceName, error);
        break;
      default:
        this.handleGenericError(serviceName, error);
    }
    
    // Attempt recovery if enabled
    if (this.config.enableAutoRecovery) {
      this.scheduleRecovery(serviceName, error);
    }
  }

  /**
   * Handle Gate.io exchange service errors
   * Requirements: 7.1, 7.2, 7.5
   */
  handleGateError(error: GateError): void {
    const serviceName = 'gate';
    this.logError(error, `Gate.io Service - ${error.code}`);
    
    // Update error tracking
    this.updateErrorTracking(serviceName, error);
    
    // Update connection status
    this.connectionStatus.gate = 'disconnected';
    
    // Handle specific error types
    switch (error.code) {
      case 'AUTH_FAILED':
        this.handleAuthenticationError(serviceName, error);
        break;
      case 'RATE_LIMIT':
        this.handleRateLimitError(serviceName, error);
        break;
      case 'INSUFFICIENT_BALANCE':
        this.handleInsufficientBalanceError(error);
        break;
      case 'MARKET_DATA_FAILED':
        this.handleMarketDataError(error);
        break;
      default:
        this.handleGenericError(serviceName, error);
    }
    
    // Attempt recovery if enabled
    if (this.config.enableAutoRecovery) {
      this.scheduleRecovery(serviceName, error);
    }
  }

  /**
   * Handle network connectivity errors with reconnection logic
   * Requirements: 7.1, 7.2
   */
  handleNetworkError(error: NetworkError): void {
    this.logError(error, `Network Error - ${error.code}`);
    
    // Update network status
    this.connectionStatus.network = 'offline';
    this.connectionStatus.lastCheck = new Date();
    
    // Emit network error event
    this.emit('networkError', {
      error,
      timestamp: new Date(),
      retryable: error.retryable
    });
    
    if (error.retryable && this.config.enableAutoRecovery) {
      this.scheduleNetworkRecovery(error);
    }
  }

  /**
   * Log errors with detailed context and timestamps
   * Requirements: 7.2, 7.4
   */
  logError(error: Error, context: string): void {
    const timestamp = new Date().toISOString();
    const errorLog = {
      timestamp,
      context,
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code || 'UNKNOWN',
      statusCode: (error as any).statusCode
    };

    // Log to console with formatting
    console.error(`[${timestamp}] ERROR in ${context}:`);
    console.error(`  ${error.name}: ${error.message}`);
    if ((error as any).code) {
      console.error(`  Code: ${(error as any).code}`);
    }
    if ((error as any).statusCode) {
      console.error(`  Status: ${(error as any).statusCode}`);
    }

    // Emit error event for external logging systems
    this.emit('errorLogged', errorLog);

    // Save error to persistent storage for analysis
    this.saveErrorToPersistentLog(errorLog);
  }

  /**
   * Start system state persistence and monitoring
   * Requirements: 7.5
   */
  startSystemMonitoring(): void {
    // Start periodic state backup
    this.stateBackupTimer = setInterval(() => {
      this.saveSystemState();
    }, this.config.stateBackupInterval);

    // Start connection monitoring
    this.connectionMonitorTimer = setInterval(() => {
      this.monitorConnections();
    }, 30000); // Check every 30 seconds

    console.log('System monitoring started - state backup and connection monitoring active');
    this.emit('monitoringStarted', { timestamp: new Date() });
  }

  /**
   * Stop system monitoring
   */
  stopSystemMonitoring(): void {
    if (this.stateBackupTimer) {
      clearInterval(this.stateBackupTimer);
      this.stateBackupTimer = null;
    }

    if (this.connectionMonitorTimer) {
      clearInterval(this.connectionMonitorTimer);
      this.connectionMonitorTimer = null;
    }

    // Clear all recovery timers
    for (const timer of this.recoveryTimers.values()) {
      clearTimeout(timer);
    }
    this.recoveryTimers.clear();

    // Save final state
    this.saveSystemState();

    console.log('System monitoring stopped');
    this.emit('monitoringStopped', { timestamp: new Date() });
  }

  /**
   * Update system state for persistence
   */
  updateSystemState(state: Partial<SystemState>): void {
    this.systemState = { ...this.systemState, ...state };
    this.systemState.lastSaveTime = new Date();
  }

  /**
   * Get current system state
   */
  getSystemState(): SystemState {
    return { ...this.systemState };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Force recovery attempt for a specific service
   */
  async forceRecovery(serviceName: string): Promise<boolean> {
    console.log(`Forcing recovery for service: ${serviceName}`);
    
    try {
      const success = await this.attemptServiceRecovery(serviceName);
      
      if (success) {
        this.resetCircuitBreaker(serviceName);
        console.log(`Recovery successful for service: ${serviceName}`);
        this.emit('recoverySuccess', { service: serviceName, timestamp: new Date() });
      } else {
        console.log(`Recovery failed for service: ${serviceName}`);
        this.emit('recoveryFailed', { service: serviceName, timestamp: new Date() });
      }
      
      return success;
    } catch (error) {
      this.logError(error as Error, `Force recovery for ${serviceName}`);
      return false;
    }
  }

  /**
   * Reset error tracking for a service
   */
  resetErrorTracking(serviceName: string): void {
    delete this.systemState.errorCounts[serviceName];
    delete this.systemState.lastErrors[serviceName];
    delete this.systemState.recoveryAttempts[serviceName];
    this.resetCircuitBreaker(serviceName);
    
    console.log(`Error tracking reset for service: ${serviceName}`);
  }

  /**
   * Check if system is in recovery mode
   */
  isInRecoveryMode(): boolean {
    return this.connectionStatus.nebius === 'recovering' || 
           this.connectionStatus.gate === 'recovering' ||
           this.connectionStatus.network === 'unstable';
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByService: { [service: string]: number };
    recentErrors: number;
    recoveryAttempts: { [service: string]: number };
  } {
    const totalErrors = Object.values(this.systemState.errorCounts).reduce((sum, count) => sum + count, 0);
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour
    
    let recentErrors = 0;
    for (const [service, lastError] of Object.entries(this.systemState.lastErrors)) {
      if (lastError.getTime() > oneHourAgo) {
        recentErrors += this.systemState.errorCounts[service] || 0;
      }
    }

    return {
      totalErrors,
      errorsByService: { ...this.systemState.errorCounts },
      recentErrors,
      recoveryAttempts: { ...this.systemState.recoveryAttempts }
    };
  }

  /**
   * Initialize circuit breakers for all services
   */
  private initializeCircuitBreakers(): void {
    const services = ['nebius', 'gate', 'network'];
    
    for (const service of services) {
      this.circuitBreakers.set(service, {
        isOpen: false,
        failureCount: 0,
        lastFailure: new Date(0),
        nextRetryTime: new Date(0)
      });
    }
  }

  /**
   * Update error tracking for a service
   */
  private updateErrorTracking(serviceName: string, error: Error): void {
    // Update error counts
    this.systemState.errorCounts[serviceName] = (this.systemState.errorCounts[serviceName] || 0) + 1;
    this.systemState.lastErrors[serviceName] = new Date();

    // Update circuit breaker
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker) {
      breaker.failureCount++;
      breaker.lastFailure = new Date();
      
      // Open circuit breaker if threshold exceeded
      if (breaker.failureCount >= this.config.errorThreshold) {
        breaker.isOpen = true;
        breaker.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeoutMs);
        
        console.log(`Circuit breaker opened for ${serviceName} - too many failures`);
        this.emit('circuitBreakerOpened', { service: serviceName, timestamp: new Date() });
      }
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthenticationError(serviceName: string, error: Error): void {
    console.error(`Authentication failed for ${serviceName}: ${error.message}`);
    
    this.emit('authenticationError', {
      service: serviceName,
      error: error.message,
      timestamp: new Date()
    });

    // Authentication errors usually require manual intervention
    // Don't attempt automatic recovery for auth failures
  }

  /**
   * Handle rate limiting errors
   */
  private handleRateLimitError(serviceName: string, error: Error): void {
    console.warn(`Rate limit exceeded for ${serviceName}: ${error.message}`);
    
    this.emit('rateLimitError', {
      service: serviceName,
      error: error.message,
      timestamp: new Date()
    });

    // Schedule recovery after rate limit period
    const delay = this.calculateRateLimitDelay(serviceName);
    this.scheduleDelayedRecovery(serviceName, delay);
  }

  /**
   * Handle server errors
   */
  private handleServerError(serviceName: string, error: Error): void {
    console.error(`Server error for ${serviceName}: ${error.message}`);
    
    this.emit('serverError', {
      service: serviceName,
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(serviceName: string, error: Error): void {
    console.error(`Generic error for ${serviceName}: ${error.message}`);
    
    this.emit('genericError', {
      service: serviceName,
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * Handle insufficient balance errors
   */
  private handleInsufficientBalanceError(error: GateError): void {
    console.warn(`Insufficient balance: ${error.message}`);
    
    this.emit('insufficientBalance', {
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * Handle market data errors
   */
  private handleMarketDataError(error: GateError): void {
    console.error(`Market data error: ${error.message}`);
    
    this.emit('marketDataError', {
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * Schedule recovery attempt for a service
   */
  private scheduleRecovery(serviceName: string, error: Error): void {
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker?.isOpen && Date.now() < breaker.nextRetryTime.getTime()) {
      console.log(`Circuit breaker open for ${serviceName} - skipping recovery attempt`);
      return;
    }

    const attempts = this.systemState.recoveryAttempts[serviceName] || 0;
    if (attempts >= this.config.maxRetryAttempts) {
      console.log(`Maximum recovery attempts reached for ${serviceName}`);
      return;
    }

    const delay = this.calculateRetryDelay(attempts);
    
    console.log(`Scheduling recovery for ${serviceName} in ${delay}ms (attempt ${attempts + 1})`);
    
    const timer = setTimeout(async () => {
      await this.attemptRecovery(serviceName);
    }, delay);
    
    this.recoveryTimers.set(serviceName, timer);
  }

  /**
   * Schedule network recovery
   */
  private scheduleNetworkRecovery(error: NetworkError): void {
    const serviceName = 'network';
    const attempts = this.systemState.recoveryAttempts[serviceName] || 0;
    
    if (attempts >= this.config.maxRetryAttempts) {
      console.log('Maximum network recovery attempts reached');
      return;
    }

    const delay = this.calculateRetryDelay(attempts);
    
    console.log(`Scheduling network recovery in ${delay}ms (attempt ${attempts + 1})`);
    
    const timer = setTimeout(async () => {
      await this.attemptNetworkRecovery();
    }, delay);
    
    this.recoveryTimers.set(serviceName, timer);
  }

  /**
   * Attempt recovery for a service
   */
  private async attemptRecovery(serviceName: string): Promise<void> {
    console.log(`Attempting recovery for ${serviceName}`);
    
    this.systemState.recoveryAttempts[serviceName] = (this.systemState.recoveryAttempts[serviceName] || 0) + 1;
    
    try {
      const success = await this.attemptServiceRecovery(serviceName);
      
      if (success) {
        console.log(`Recovery successful for ${serviceName}`);
        this.resetErrorTracking(serviceName);
        this.updateConnectionStatus(serviceName, 'connected');
        this.emit('recoverySuccess', { service: serviceName, timestamp: new Date() });
      } else {
        console.log(`Recovery failed for ${serviceName}`);
        this.updateConnectionStatus(serviceName, 'disconnected');
        this.emit('recoveryFailed', { service: serviceName, timestamp: new Date() });
        
        // Schedule next recovery attempt
        this.scheduleRecovery(serviceName, new Error('Recovery failed'));
      }
    } catch (error) {
      this.logError(error as Error, `Recovery attempt for ${serviceName}`);
      this.updateConnectionStatus(serviceName, 'disconnected');
    }
  }

  /**
   * Attempt network recovery
   */
  private async attemptNetworkRecovery(): Promise<void> {
    console.log('Attempting network recovery');
    
    this.systemState.recoveryAttempts['network'] = (this.systemState.recoveryAttempts['network'] || 0) + 1;
    
    try {
      const isOnline = await this.checkNetworkConnectivity();
      
      if (isOnline) {
        console.log('Network recovery successful');
        this.connectionStatus.network = 'online';
        this.resetErrorTracking('network');
        this.emit('networkRecoverySuccess', { timestamp: new Date() });
      } else {
        console.log('Network recovery failed');
        this.connectionStatus.network = 'offline';
        this.scheduleNetworkRecovery(new NetworkError('Network still offline', 'NETWORK_OFFLINE', true));
      }
    } catch (error) {
      this.logError(error as Error, 'Network recovery attempt');
      this.connectionStatus.network = 'offline';
    }
  }

  /**
   * Attempt service-specific recovery
   */
  private async attemptServiceRecovery(serviceName: string): Promise<boolean> {
    // This would be implemented with actual service recovery logic
    // For now, return a simulated recovery attempt
    
    this.updateConnectionStatus(serviceName, 'recovering');
    
    // Simulate recovery attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate success/failure (in real implementation, this would test actual connectivity)
    const success = Math.random() > 0.3; // 70% success rate for simulation
    
    return success;
  }

  /**
   * Check network connectivity
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      // Simple connectivity check - in real implementation, this might ping specific endpoints
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.networkTimeoutMs);
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Monitor all connections
   */
  private async monitorConnections(): Promise<void> {
    this.connectionStatus.lastCheck = new Date();
    
    // Check network connectivity
    const networkOnline = await this.checkNetworkConnectivity();
    if (networkOnline && this.connectionStatus.network === 'offline') {
      this.connectionStatus.network = 'online';
      this.emit('networkRestored', { timestamp: new Date() });
    } else if (!networkOnline && this.connectionStatus.network === 'online') {
      this.connectionStatus.network = 'offline';
      this.emit('networkLost', { timestamp: new Date() });
    }
    
    // Emit connection status update
    this.emit('connectionStatusUpdate', this.connectionStatus);
  }

  /**
   * Update connection status for a service
   */
  private updateConnectionStatus(serviceName: string, status: 'connected' | 'disconnected' | 'recovering'): void {
    if (serviceName === 'nebius') {
      this.connectionStatus.nebius = status;
    } else if (serviceName === 'gate') {
      this.connectionStatus.gate = status;
    }
    
    this.connectionStatus.lastCheck = new Date();
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempts: number): number {
    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, attempts),
      this.config.maxRetryDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Calculate rate limit delay
   */
  private calculateRateLimitDelay(serviceName: string): number {
    // Different services may have different rate limit recovery times
    const basedelay = serviceName === 'nebius' ? 60000 : 30000; // 1 minute for Nebius, 30 seconds for Gate
    return basedelay + (Math.random() * 10000); // Add up to 10 seconds jitter
  }

  /**
   * Schedule delayed recovery
   */
  private scheduleDelayedRecovery(serviceName: string, delay: number): void {
    const timer = setTimeout(async () => {
      await this.attemptRecovery(serviceName);
    }, delay);
    
    this.recoveryTimers.set(`${serviceName}_delayed`, timer);
  }

  /**
   * Reset circuit breaker for a service
   */
  private resetCircuitBreaker(serviceName: string): void {
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker) {
      breaker.isOpen = false;
      breaker.failureCount = 0;
      breaker.lastFailure = new Date(0);
      breaker.nextRetryTime = new Date(0);
    }
  }

  /**
   * Save system state to persistent storage
   */
  private saveSystemState(): void {
    try {
      const stateToSave = {
        ...this.systemState,
        connectionStatus: this.connectionStatus,
        circuitBreakers: Object.fromEntries(this.circuitBreakers)
      };
      
      writeFileSync(this.config.persistStatePath, JSON.stringify(stateToSave, null, 2));
      this.systemState.lastSaveTime = new Date();
      
    } catch (error) {
      console.error('Failed to save system state:', error);
    }
  }

  /**
   * Load persisted system state
   */
  private loadPersistedState(): void {
    try {
      if (existsSync(this.config.persistStatePath)) {
        const savedState = JSON.parse(readFileSync(this.config.persistStatePath, 'utf8'));
        
        // Restore system state
        this.systemState = {
          ...this.systemState,
          ...savedState,
          isRunning: false, // Always start as not running
          startTime: null,
          lastSaveTime: new Date()
        };
        
        // Restore connection status
        if (savedState.connectionStatus) {
          this.connectionStatus = {
            ...savedState.connectionStatus,
            lastCheck: new Date() // Update last check time
          };
        }
        
        // Restore circuit breakers
        if (savedState.circuitBreakers) {
          for (const [service, breaker] of Object.entries(savedState.circuitBreakers)) {
            this.circuitBreakers.set(service, breaker as any);
          }
        }
        
        console.log('System state loaded from persistent storage');
        this.emit('stateLoaded', { timestamp: new Date() });
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }

  /**
   * Save error to persistent log
   */
  private saveErrorToPersistentLog(errorLog: any): void {
    try {
      const logPath = this.config.persistStatePath.replace('.json', '-errors.log');
      const logEntry = JSON.stringify(errorLog) + '\n';
      
      // Append to error log file
      require('fs').appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error('Failed to save error to persistent log:', error);
    }
  }
}

/**
 * Network Error class
 */
class NetworkError extends Error implements NetworkError {
  public code: string;
  public retryable: boolean;

  constructor(message: string, code: string, retryable: boolean = true) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    this.retryable = retryable;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}

export { NetworkError };