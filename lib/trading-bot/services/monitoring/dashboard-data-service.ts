// Dashboard Data Service - Real-time dashboard data aggregation
// Implements account balance display with real-time updates,
// open positions view with current P&L, and trading performance metrics tracking

import { EventEmitter } from 'events';
import { 
  DashboardData, 
  PerformanceMetrics, 
  TradingActivityLog, 
  SystemHealthStatus,
  RealTimeUpdate 
} from './types';
import { 
  TradingPosition, 
  TradeExecution, 
  GateExchangeService, 
  RiskManagementService,
  ErrorHandler 
} from '../../types';
import { PerformanceTracker } from './performance-tracker';

export class DashboardDataService extends EventEmitter {
  private gateService: GateExchangeService;
  private riskService: RiskManagementService;
  private performanceTracker: PerformanceTracker;
  private errorHandler: ErrorHandler;
  
  private currentDashboardData: DashboardData | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  
  // Real-time update configuration
  private readonly UPDATE_INTERVAL_MS = 5000; // 5 seconds
  private readonly ACTIVITY_LOG_MAX_SIZE = 100;

  constructor(
    gateService: GateExchangeService,
    riskService: RiskManagementService,
    errorHandler: ErrorHandler
  ) {
    super();
    this.gateService = gateService;
    this.riskService = riskService;
    this.errorHandler = errorHandler;
    this.performanceTracker = new PerformanceTracker();
  }

  /**
   * Start real-time dashboard data updates
   * Requirements: 5.1, 5.2, 5.3
   */
  async startRealTimeUpdates(): Promise<void> {
    if (this.isRunning) {
      console.log('Dashboard data service is already running');
      return;
    }

    try {
      console.log('Starting dashboard data service...');
      
      // Initial data load
      await this.updateDashboardData();
      
      // Start periodic updates
      this.updateInterval = setInterval(async () => {
        try {
          await this.updateDashboardData();
        } catch (error) {
          this.errorHandler.logError(error as Error, 'Dashboard data update');
        }
      }, this.UPDATE_INTERVAL_MS);
      
      this.isRunning = true;
      
      this.emit('serviceStarted', {
        timestamp: new Date(),
        updateInterval: this.UPDATE_INTERVAL_MS
      });
      
      console.log('Dashboard data service started successfully');
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Start dashboard data service');
      throw error;
    }
  }

  /**
   * Stop real-time dashboard data updates
   */
  async stopRealTimeUpdates(): Promise<void> {
    if (!this.isRunning) {
      console.log('Dashboard data service is not running');
      return;
    }

    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      this.isRunning = false;
      
      this.emit('serviceStopped', {
        timestamp: new Date()
      });
      
      console.log('Dashboard data service stopped');
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Stop dashboard data service');
    }
  }

  /**
   * Get current dashboard data
   */
  getCurrentDashboardData(): DashboardData | null {
    return this.currentDashboardData;
  }

  /**
   * Update account balance information with real-time data
   * Requirements: 5.1
   */
  private async updateAccountBalance(): Promise<DashboardData['accountBalance']> {
    try {
      const accountBalance = await this.gateService.getAccountBalance();
      
      // Calculate total balance (assuming USDT as base currency)
      const usdtBalance = accountBalance['USDT'] || { available: 0, locked: 0 };
      const total = (usdtBalance.available || 0) + (usdtBalance.locked || 0);
      
      const balanceData = {
        total,
        available: usdtBalance.available || 0,
        locked: usdtBalance.locked || 0,
        currency: 'USDT',
        lastUpdate: new Date()
      };
      
      // Emit real-time update
      this.emitRealTimeUpdate('balance_update', balanceData);
      
      return balanceData;
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Update account balance');
      
      // Return cached data or default values
      return this.currentDashboardData?.accountBalance || {
        total: 0,
        available: 0,
        locked: 0,
        currency: 'USDT',
        lastUpdate: new Date()
      };
    }
  }

  /**
   * Update open positions with current P&L
   * Requirements: 5.2
   */
  private async updatePositions(): Promise<DashboardData['positions']> {
    try {
      const openPositions = await this.gateService.getOpenPositions();
      
      // Calculate total values
      let totalValue = 0;
      let totalPnL = 0;
      
      for (const position of openPositions) {
        const positionValue = position.amount * position.currentPrice;
        totalValue += positionValue;
        totalPnL += position.unrealizedPnL;
      }
      
      const positionsData = {
        open: openPositions,
        totalValue,
        totalPnL,
        count: openPositions.length
      };
      
      // Update performance tracker with position data
      this.performanceTracker.updatePositions(openPositions);
      
      // Emit real-time update
      this.emitRealTimeUpdate('position_update', positionsData);
      
      return positionsData;
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Update positions');
      
      // Return cached data or default values
      return this.currentDashboardData?.positions || {
        open: [],
        totalValue: 0,
        totalPnL: 0,
        count: 0
      };
    }
  }

  /**
   * Update trading performance metrics
   * Requirements: 5.3
   */
  private async updatePerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const metrics = await this.performanceTracker.getPerformanceMetrics();
      
      // Emit real-time update
      this.emitRealTimeUpdate('performance_update', metrics);
      
      return metrics;
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Update performance metrics');
      
      // Return cached data or default values
      return this.currentDashboardData?.performance || this.getDefaultPerformanceMetrics();
    }
  }

  /**
   * Update system health status
   */
  private async updateSystemHealth(): Promise<SystemHealthStatus> {
    try {
      // Get risk management status
      const riskStatus = this.riskService.getRiskStatus();
      
      // Basic system health check
      const systemHealth: SystemHealthStatus = {
        isRunning: this.isRunning,
        uptime: this.performanceTracker.getUptime(),
        lastUpdate: new Date(),
        services: {
          nebiusAI: {
            isConnected: true, // Would check actual service status
            lastPing: new Date(),
            responseTime: 100,
            errorCount: 0,
            status: 'healthy'
          },
          gateExchange: {
            isConnected: true, // Would check actual service status
            lastPing: new Date(),
            responseTime: 150,
            errorCount: 0,
            status: 'healthy'
          },
          marketData: {
            isConnected: true,
            lastPing: new Date(),
            responseTime: 50,
            errorCount: 0,
            status: 'healthy'
          },
          riskManagement: {
            isConnected: !riskStatus.emergencyStopActive,
            lastPing: new Date(),
            responseTime: 10,
            errorCount: 0,
            status: riskStatus.emergencyStopActive ? 'down' : 'healthy'
          }
        },
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpuUsage: 0, // Would implement actual CPU monitoring
        networkLatency: 100,
        errorRate: 0
      };
      
      return systemHealth;
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Update system health');
      
      return this.currentDashboardData?.systemHealth || this.getDefaultSystemHealth();
    }
  }

  /**
   * Update complete dashboard data
   */
  private async updateDashboardData(): Promise<void> {
    try {
      const [accountBalance, positions, performance, systemHealth] = await Promise.all([
        this.updateAccountBalance(),
        this.updatePositions(),
        this.updatePerformanceMetrics(),
        this.updateSystemHealth()
      ]);
      
      const recentActivity = this.performanceTracker.getRecentActivity(20);
      
      this.currentDashboardData = {
        accountBalance,
        positions,
        performance,
        recentActivity,
        systemHealth
      };
      
      // Emit complete dashboard update
      this.emit('dashboardUpdated', this.currentDashboardData);
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Update complete dashboard data');
    }
  }

  /**
   * Record trading activity for dashboard display
   */
  recordTradingActivity(activity: Omit<TradingActivityLog, 'id' | 'timestamp'>): void {
    const logEntry: TradingActivityLog = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...activity
    };
    
    this.performanceTracker.addActivityLog(logEntry);
    
    // Emit real-time activity update
    this.emit('activityLogged', logEntry);
  }

  /**
   * Record trade execution for performance tracking
   */
  recordTradeExecution(trade: TradeExecution): void {
    this.performanceTracker.recordTrade(trade);
    
    this.recordTradingActivity({
      type: 'trade_executed',
      symbol: trade.symbol,
      action: trade.side,
      amount: trade.amount,
      price: trade.price,
      message: `${trade.side.toUpperCase()} order executed: ${trade.amount} ${trade.symbol} at ${trade.price}`,
      data: trade,
      severity: 'info'
    });
  }

  /**
   * Record position update
   */
  recordPositionUpdate(position: TradingPosition, action: 'opened' | 'closed'): void {
    this.recordTradingActivity({
      type: action === 'opened' ? 'position_opened' : 'position_closed',
      symbol: position.symbol,
      action: position.side,
      amount: position.amount,
      price: position.entryPrice,
      message: `Position ${action}: ${position.side.toUpperCase()} ${position.amount} ${position.symbol} at ${position.entryPrice}`,
      data: position,
      severity: 'info'
    });
  }

  /**
   * Emit real-time update event
   */
  private emitRealTimeUpdate(type: RealTimeUpdate['type'], data: any): void {
    const update: RealTimeUpdate = {
      type,
      timestamp: new Date(),
      data
    };
    
    this.emit('realTimeUpdate', update);
  }

  /**
   * Get default performance metrics
   */
  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      profitLoss: 0,
      winRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      uptime: 0,
      averageTradeSize: 0,
      totalVolume: 0,
      successfulTrades: 0,
      failedTrades: 0,
      currentBalance: 0,
      startingBalance: 0,
      returnOnInvestment: 0
    };
  }

  /**
   * Get default system health status
   */
  private getDefaultSystemHealth(): SystemHealthStatus {
    return {
      isRunning: false,
      uptime: 0,
      lastUpdate: new Date(),
      services: {
        nebiusAI: { isConnected: false, lastPing: new Date(), responseTime: 0, errorCount: 0, status: 'down' },
        gateExchange: { isConnected: false, lastPing: new Date(), responseTime: 0, errorCount: 0, status: 'down' },
        marketData: { isConnected: false, lastPing: new Date(), responseTime: 0, errorCount: 0, status: 'down' },
        riskManagement: { isConnected: false, lastPing: new Date(), responseTime: 0, errorCount: 0, status: 'down' }
      },
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      errorRate: 0
    };
  }

  /**
   * Get service status
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Force dashboard data refresh
   */
  async refreshDashboardData(): Promise<void> {
    await this.updateDashboardData();
  }
}