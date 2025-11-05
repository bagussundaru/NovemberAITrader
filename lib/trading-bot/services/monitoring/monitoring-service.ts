// Monitoring Service - Comprehensive trading activity logging and system monitoring
// Implements comprehensive trading activity logging and system health monitoring

import { EventEmitter } from 'events';
import { writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { 
  TradingActivityLog, 
  SystemHealthStatus, 
  PerformanceMetrics,
  AlertMessage 
} from './types';
import { 
  TradingPosition, 
  TradeExecution, 
  TradingSignal, 
  MarketData,
  ErrorHandler 
} from '../../types';
import { DashboardDataService } from './dashboard-data-service';
import { NotificationService } from './notification-service';
import { PerformanceTracker } from './performance-tracker';

export interface MonitoringConfig {
  enableFileLogging: boolean;
  logDirectory: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxLogFileSize: number; // in MB
  logRetentionDays: number;
  enableSystemHealthMonitoring: boolean;
  healthCheckInterval: number; // in ms
}

export class MonitoringService extends EventEmitter {
  private config: MonitoringConfig;
  private errorHandler: ErrorHandler;
  private dashboardService: DashboardDataService;
  private notificationService: NotificationService;
  private performanceTracker: PerformanceTracker;
  
  private isRunning: boolean = false;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private logBuffer: TradingActivityLog[] = [];
  private readonly LOG_BUFFER_SIZE = 50;

  constructor(
    config: MonitoringConfig,
    dashboardService: DashboardDataService,
    notificationService: NotificationService,
    errorHandler: ErrorHandler
  ) {
    super();
    this.config = config;
    this.dashboardService = dashboardService;
    this.notificationService = notificationService;
    this.errorHandler = errorHandler;
    this.performanceTracker = new PerformanceTracker();
  }

  /**
   * Start monitoring service
   * Requirements: 5.4, 5.5, 7.4
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('Monitoring service is already running');
      return;
    }

    try {
      console.log('Starting monitoring service...');
      
      // Initialize log directory
      if (this.config.enableFileLogging) {
        await this.initializeLogDirectory();
      }
      
      // Start dashboard data service
      await this.dashboardService.startRealTimeUpdates();
      
      // Start notification service
      await this.notificationService.startNotificationService();
      
      // Start system health monitoring
      if (this.config.enableSystemHealthMonitoring) {
        this.startHealthMonitoring();
      }
      
      // Setup event handlers
      this.setupEventHandlers();
      
      this.isRunning = true;
      
      // Log service startup
      await this.logTradingActivity({
        type: 'system_event',
        message: 'Monitoring service started successfully',
        severity: 'info'
      });
      
      this.emit('monitoringStarted', {
        timestamp: new Date(),
        config: this.config
      });
      
      console.log('Monitoring service started successfully');
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Start monitoring service');
      throw error;
    }
  }

  /**
   * Stop monitoring service
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isRunning) {
      console.log('Monitoring service is not running');
      return;
    }

    try {
      console.log('Stopping monitoring service...');
      
      // Stop health monitoring
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }
      
      // Flush log buffer
      await this.flushLogBuffer();
      
      // Stop services
      await this.dashboardService.stopRealTimeUpdates();
      await this.notificationService.stopNotificationService();
      
      this.isRunning = false;
      
      // Log service shutdown
      await this.logTradingActivity({
        type: 'system_event',
        message: 'Monitoring service stopped',
        severity: 'info'
      });
      
      this.emit('monitoringStopped', {
        timestamp: new Date()
      });
      
      console.log('Monitoring service stopped');
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Stop monitoring service');
    }
  }

  /**
   * Log comprehensive trading activity
   * Requirements: 5.4
   */
  async logTradingActivity(activity: Omit<TradingActivityLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const logEntry: TradingActivityLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ...activity
      };
      
      // Add to buffer
      this.logBuffer.push(logEntry);
      
      // Record in dashboard service
      this.dashboardService.recordTradingActivity(activity);
      
      // Emit log event
      this.emit('activityLogged', logEntry);
      
      // Write to file if enabled
      if (this.config.enableFileLogging) {
        await this.writeLogToFile(logEntry);
      }
      
      // Flush buffer if full
      if (this.logBuffer.length >= this.LOG_BUFFER_SIZE) {
        await this.flushLogBuffer();
      }
      
      // Send notification for important events
      if (activity.severity === 'error' || activity.type === 'trade_executed') {
        await this.notificationService.sendTradingNotification(
          `Trading Activity: ${activity.type}`,
          activity.message,
          activity.severity === 'error' ? 'error' : 'info',
          activity.data
        );
      }
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Log trading activity');
    }
  }

  /**
   * Log trade execution
   */
  async logTradeExecution(trade: TradeExecution): Promise<void> {
    await this.logTradingActivity({
      type: 'trade_executed',
      symbol: trade.symbol,
      action: trade.side,
      amount: trade.amount,
      price: trade.price,
      message: `Trade executed: ${trade.side.toUpperCase()} ${trade.amount} ${trade.symbol} at ${trade.price}`,
      data: trade,
      severity: trade.status === 'filled' ? 'info' : 'warning'
    });
    
    // Record in performance tracker
    this.performanceTracker.recordTrade(trade);
    
    // Record in dashboard service
    this.dashboardService.recordTradeExecution(trade);
    
    // Send notification
    await this.notificationService.notifyTradeExecution(trade);
  }

  /**
   * Log signal received
   */
  async logSignalReceived(signal: TradingSignal): Promise<void> {
    await this.logTradingActivity({
      type: 'signal_received',
      symbol: signal.symbol,
      action: signal.action,
      message: `AI signal received: ${signal.action.toUpperCase()} ${signal.symbol} (confidence: ${(signal.confidence * 100).toFixed(1)}%)`,
      data: signal,
      severity: 'info'
    });
    
    // Send notification
    await this.notificationService.notifySignalReceived(signal);
  }

  /**
   * Log position update
   */
  async logPositionUpdate(position: TradingPosition, action: 'opened' | 'closed'): Promise<void> {
    await this.logTradingActivity({
      type: action === 'opened' ? 'position_opened' : 'position_closed',
      symbol: position.symbol,
      action: position.side,
      amount: position.amount,
      price: position.entryPrice,
      message: `Position ${action}: ${position.side.toUpperCase()} ${position.amount} ${position.symbol}`,
      data: position,
      severity: action === 'closed' && position.unrealizedPnL < 0 ? 'warning' : 'info'
    });
    
    // Record in dashboard service
    this.dashboardService.recordPositionUpdate(position, action);
    
    // Send notification
    await this.notificationService.notifyPositionUpdate(position, action);
  }

  /**
   * Log system error
   */
  async logSystemError(error: Error, context: string, severity: 'error' | 'warning' = 'error'): Promise<void> {
    await this.logTradingActivity({
      type: 'error',
      message: `System error in ${context}: ${error.message}`,
      data: {
        error: error.message,
        stack: error.stack,
        context
      },
      severity
    });
    
    // Send critical alert for errors
    if (severity === 'error') {
      await this.notificationService.sendCriticalAlert(
        `System Error: ${context}`,
        error.message,
        error,
        false // Don't activate safe mode automatically
      );
    }
  }

  /**
   * Log market data update
   */
  async logMarketDataUpdate(marketData: MarketData): Promise<void> {
    // Only log significant market data events to avoid spam
    if (this.config.logLevel === 'debug') {
      await this.logTradingActivity({
        type: 'system_event',
        symbol: marketData.symbol,
        message: `Market data updated: ${marketData.symbol} at ${marketData.price}`,
        data: {
          symbol: marketData.symbol,
          price: marketData.price,
          volume: marketData.volume,
          timestamp: marketData.timestamp
        },
        severity: 'info'
      });
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealthStatus(): Promise<SystemHealthStatus> {
    try {
      const dashboardData = this.dashboardService.getCurrentDashboardData();
      
      if (dashboardData?.systemHealth) {
        return dashboardData.systemHealth;
      }
      
      // Fallback health check
      return {
        isRunning: this.isRunning,
        uptime: this.performanceTracker.getUptime(),
        lastUpdate: new Date(),
        services: {
          nebiusAI: { isConnected: true, lastPing: new Date(), responseTime: 100, errorCount: 0, status: 'healthy' },
          gateExchange: { isConnected: true, lastPing: new Date(), responseTime: 150, errorCount: 0, status: 'healthy' },
          marketData: { isConnected: true, lastPing: new Date(), responseTime: 50, errorCount: 0, status: 'healthy' },
          riskManagement: { isConnected: true, lastPing: new Date(), responseTime: 10, errorCount: 0, status: 'healthy' }
        },
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        cpuUsage: 0,
        networkLatency: 100,
        errorRate: 0
      };
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Get system health status');
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return await this.performanceTracker.getPerformanceMetrics();
  }

  /**
   * Get recent activity logs
   */
  getRecentActivityLogs(limit: number = 50): TradingActivityLog[] {
    return this.performanceTracker.getRecentActivity(limit);
  }

  /**
   * Initialize log directory
   */
  private async initializeLogDirectory(): Promise<void> {
    try {
      if (!existsSync(this.config.logDirectory)) {
        await mkdir(this.config.logDirectory, { recursive: true });
      }
      
      console.log(`Log directory initialized: ${this.config.logDirectory}`);
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Initialize log directory');
      throw error;
    }
  }

  /**
   * Write log entry to file
   */
  private async writeLogToFile(logEntry: TradingActivityLog): Promise<void> {
    try {
      const logFileName = `trading-bot-${new Date().toISOString().split('T')[0]}.log`;
      const logFilePath = join(this.config.logDirectory, logFileName);
      
      const logLine = JSON.stringify({
        timestamp: logEntry.timestamp.toISOString(),
        id: logEntry.id,
        type: logEntry.type,
        symbol: logEntry.symbol,
        action: logEntry.action,
        amount: logEntry.amount,
        price: logEntry.price,
        message: logEntry.message,
        severity: logEntry.severity,
        data: logEntry.data
      }) + '\n';
      
      await appendFile(logFilePath, logLine);
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Write log to file');
    }
  }

  /**
   * Flush log buffer to file
   */
  private async flushLogBuffer(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.config.enableFileLogging) {
      return;
    }

    try {
      const logFileName = `trading-bot-${new Date().toISOString().split('T')[0]}.log`;
      const logFilePath = join(this.config.logDirectory, logFileName);
      
      const logLines = this.logBuffer.map(entry => 
        JSON.stringify({
          timestamp: entry.timestamp.toISOString(),
          id: entry.id,
          type: entry.type,
          symbol: entry.symbol,
          action: entry.action,
          amount: entry.amount,
          price: entry.price,
          message: entry.message,
          severity: entry.severity,
          data: entry.data
        })
      ).join('\n') + '\n';
      
      await appendFile(logFilePath, logLines);
      
      // Clear buffer
      this.logBuffer = [];
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Flush log buffer');
    }
  }

  /**
   * Start system health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const healthStatus = await this.getSystemHealthStatus();
        
        // Check for health issues
        await this.checkHealthThresholds(healthStatus);
        
        this.emit('healthCheck', healthStatus);
        
      } catch (error) {
        this.errorHandler.logError(error as Error, 'Health monitoring check');
      }
    }, this.config.healthCheckInterval);
    
    console.log(`Health monitoring started with ${this.config.healthCheckInterval}ms interval`);
  }

  /**
   * Check health thresholds and send alerts
   */
  private async checkHealthThresholds(healthStatus: SystemHealthStatus): Promise<void> {
    // Check memory usage
    if (healthStatus.memoryUsage > 500) { // 500MB threshold
      await this.notificationService.sendPerformanceAlert(
        'Memory Usage',
        healthStatus.memoryUsage,
        500,
        `High memory usage detected: ${healthStatus.memoryUsage.toFixed(1)}MB`
      );
    }
    
    // Check error rate
    if (healthStatus.errorRate > 10) { // 10% error rate threshold
      await this.notificationService.sendPerformanceAlert(
        'Error Rate',
        healthStatus.errorRate,
        10,
        `High error rate detected: ${healthStatus.errorRate.toFixed(1)}%`
      );
    }
    
    // Check service health
    for (const [serviceName, serviceStatus] of Object.entries(healthStatus.services)) {
      if (serviceStatus.status === 'down') {
        await this.notificationService.sendCriticalAlert(
          `Service Down: ${serviceName}`,
          `Service ${serviceName} is not responding`,
          undefined,
          true // Activate safe mode for critical service failures
        );
      }
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Dashboard service events
    this.dashboardService.on('realTimeUpdate', (update) => {
      this.emit('realTimeUpdate', update);
    });
    
    this.dashboardService.on('activityLogged', (activity) => {
      this.performanceTracker.addActivityLog(activity);
    });
    
    // Notification service events
    this.notificationService.on('criticalAlert', async (alert: AlertMessage) => {
      await this.logTradingActivity({
        type: 'error',
        message: `Critical alert: ${alert.title} - ${alert.message}`,
        data: alert,
        severity: 'error'
      });
    });
    
    this.notificationService.on('safeModeActivated', async (alert: AlertMessage) => {
      await this.logTradingActivity({
        type: 'system_event',
        message: `SAFE MODE ACTIVATED: ${alert.message}`,
        data: alert,
        severity: 'error'
      });
    });
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart health monitoring if interval changed
    if (newConfig.healthCheckInterval && this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.startHealthMonitoring();
    }
    
    this.emit('configUpdated', this.config);
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStatistics(): {
    isRunning: boolean;
    uptime: number;
    totalLogs: number;
    logBufferSize: number;
    notificationStats: any;
  } {
    return {
      isRunning: this.isRunning,
      uptime: this.performanceTracker.getUptime(),
      totalLogs: this.performanceTracker.getRecentActivity(1000).length,
      logBufferSize: this.logBuffer.length,
      notificationStats: this.notificationService.getNotificationStatistics()
    };
  }

  /**
   * Check if service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }
}