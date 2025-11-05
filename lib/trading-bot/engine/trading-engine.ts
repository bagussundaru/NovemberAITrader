// Trading Engine Core - Main Trading Orchestrator
// Implements trading session management, market data processing pipeline,
// and AI signal processing with trade execution flow

import { EventEmitter } from 'events';
import { 
  TradingEngine as ITradingEngine,
  TradingBotConfig,
  MarketData,
  TradingSignal,
  TradingPosition,
  TradeExecution,
  NebiusAIService,
  GateExchangeService,
  MarketDataService,
  RiskManagementService,
  ErrorHandler,
  NetworkError
} from '../types';
import { AutomatedTradingLogic, AutoTradingConfig, TradingDecision } from './automated-trading-logic';
import { ErrorHandlingRecoverySystem, RecoveryConfig, SystemState } from './error-handling-recovery';

export interface TradingEngineState {
  isRunning: boolean;
  startTime: Date | null;
  totalTrades: number;
  activePositions: number;
  lastMarketUpdate: Date | null;
  lastSignalProcessed: Date | null;
}

export interface TradingSessionConfig {
  tradingPairs: string[];
  maxConcurrentTrades: number;
  signalProcessingInterval: number;
  positionUpdateInterval: number;
  enableAutoTrading: boolean;
}

export class TradingEngine extends EventEmitter implements ITradingEngine {
  private config: TradingBotConfig;
  private sessionConfig: TradingSessionConfig;
  private state: TradingEngineState;
  
  // Service dependencies
  private nebiusService: NebiusAIService;
  private gateService: GateExchangeService;
  private marketDataService: MarketDataService;
  private riskService: RiskManagementService;
  private errorHandler: ErrorHandler;
  
  // Error handling and recovery system
  private recoverySystem: ErrorHandlingRecoverySystem;
  
  // Automated trading logic
  private autoTradingLogic: AutomatedTradingLogic;
  
  // Internal state management
  private activePositions: Map<string, TradingPosition> = new Map();
  private pendingSignals: Map<string, TradingSignal> = new Map();
  private marketDataCache: Map<string, MarketData> = new Map();
  
  // Interval timers
  private signalProcessingTimer: NodeJS.Timeout | null = null;
  private positionUpdateTimer: NodeJS.Timeout | null = null;
  private riskMonitoringTimer: NodeJS.Timeout | null = null;

  constructor(
    config: TradingBotConfig,
    services: {
      nebiusService: NebiusAIService;
      gateService: GateExchangeService;
      marketDataService: MarketDataService;
      riskService: RiskManagementService;
      errorHandler: ErrorHandler;
    },
    sessionConfig?: Partial<TradingSessionConfig>,
    autoTradingConfig?: Partial<AutoTradingConfig>,
    recoveryConfig?: Partial<RecoveryConfig>
  ) {
    super();
    
    this.config = config;
    this.nebiusService = services.nebiusService;
    this.gateService = services.gateService;
    this.marketDataService = services.marketDataService;
    this.riskService = services.riskService;
    this.errorHandler = services.errorHandler;
    
    // Initialize error handling and recovery system
    this.recoverySystem = new ErrorHandlingRecoverySystem({
      maxRetryAttempts: 5,
      baseRetryDelay: 1000,
      maxRetryDelay: 60000,
      networkTimeoutMs: 10000,
      stateBackupInterval: 30000,
      errorThreshold: 10,
      recoveryTimeoutMs: 300000,
      enableAutoRecovery: true,
      persistStatePath: './trading-bot-state.json',
      ...recoveryConfig
    });
    
    // Use recovery system as the error handler
    this.errorHandler = this.recoverySystem;
    
    // Initialize automated trading logic
    this.autoTradingLogic = new AutomatedTradingLogic(
      {
        minConfidenceThreshold: 0.6,
        maxPositionsPerSymbol: 1,
        positionSizePercentage: 0.1,
        enableBuySignals: true,
        enableSellSignals: true,
        enableContinuousMonitoring: true,
        monitoringInterval: 30000,
        rebalanceThreshold: 0.05,
        ...autoTradingConfig
      },
      this.gateService,
      this.riskService,
      this.errorHandler
    );
    
    // Initialize session configuration with defaults
    this.sessionConfig = {
      tradingPairs: config.tradingPairs || ['BTC/USDT', 'ETH/USDT'],
      maxConcurrentTrades: 5,
      signalProcessingInterval: 30000, // 30 seconds
      positionUpdateInterval: 10000, // 10 seconds
      enableAutoTrading: true,
      ...sessionConfig
    };
    
    // Initialize engine state
    this.state = {
      isRunning: false,
      startTime: null,
      totalTrades: 0,
      activePositions: 0,
      lastMarketUpdate: null,
      lastSignalProcessed: null
    };
    
    this.setupEventHandlers();
  }

  /**
   * Start trading session - implements trading session management
   * Requirements: 4.1, 4.2, 1.2, 2.3
   */
  async startTrading(): Promise<void> {
    if (this.state.isRunning) {
      console.log('Trading session is already running');
      return;
    }

    try {
      console.log('Starting trading session...');
      
      // Validate all services are ready
      await this.validateServices();
      
      // Initialize market data subscriptions
      await this.initializeMarketDataPipeline();
      
      // Start periodic processes
      this.startPeriodicProcesses();
      
      // Start automated trading logic monitoring
      await this.autoTradingLogic.startContinuousMonitoring();
      
      // Start error handling and recovery system monitoring
      this.recoverySystem.startSystemMonitoring();
      
      // Update system state in recovery system
      this.recoverySystem.updateSystemState({
        isRunning: true,
        startTime: new Date(),
        activePositions: Array.from(this.activePositions.values()),
        pendingSignals: Array.from(this.pendingSignals.values()),
        marketDataCache: Object.fromEntries(this.marketDataCache)
      });
      
      // Update state
      this.state.isRunning = true;
      this.state.startTime = new Date();
      
      this.emit('tradingStarted', {
        timestamp: new Date(),
        tradingPairs: this.sessionConfig.tradingPairs,
        config: this.sessionConfig
      });
      
      console.log(`Trading session started successfully for pairs: ${this.sessionConfig.tradingPairs.join(', ')}`);
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Start trading session');
      
      const networkError: NetworkError = {
        name: 'TradingStartError',
        message: `Failed to start trading session: ${(error as Error).message}`,
        code: 'TRADING_START_FAILED',
        retryable: true
      };
      
      this.errorHandler.handleNetworkError(networkError);
      throw networkError;
    }
  }

  /**
   * Stop trading session gracefully
   */
  async stopTrading(): Promise<void> {
    if (!this.state.isRunning) {
      console.log('Trading session is not running');
      return;
    }

    try {
      console.log('Stopping trading session...');
      
      // Stop periodic processes
      this.stopPeriodicProcesses();
      
      // Stop automated trading logic monitoring
      this.autoTradingLogic.stopContinuousMonitoring();
      
      // Stop error handling and recovery system monitoring
      this.recoverySystem.stopSystemMonitoring();
      
      // Stop market data collection
      await this.marketDataService.stopRealTimeCollection();
      
      // Update system state in recovery system
      this.recoverySystem.updateSystemState({
        isRunning: false,
        activePositions: Array.from(this.activePositions.values()),
        pendingSignals: Array.from(this.pendingSignals.values()),
        marketDataCache: Object.fromEntries(this.marketDataCache)
      });
      
      // Update state
      this.state.isRunning = false;
      
      this.emit('tradingStopped', {
        timestamp: new Date(),
        sessionDuration: this.state.startTime ? Date.now() - this.state.startTime.getTime() : 0,
        totalTrades: this.state.totalTrades,
        activePositions: this.state.activePositions
      });
      
      console.log('Trading session stopped successfully');
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Stop trading session');
      throw error;
    }
  }

  /**
   * Process incoming market data - implements market data processing pipeline
   * Updates internal market state within 1-second requirement
   */
  async processMarketData(data: MarketData): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!this.state.isRunning) {
        return;
      }

      // Validate market data integrity
      if (!this.marketDataService.validateDataIntegrity(data)) {
        throw new Error(`Invalid market data received for ${data.symbol}`);
      }

      // Update market data cache
      this.marketDataCache.set(data.symbol, data);
      this.state.lastMarketUpdate = new Date();

      // Update automated trading logic with new market data
      this.autoTradingLogic.updateMarketData(data);

      // Emit market data update event
      this.emit('marketDataUpdate', data);

      // Process AI signal if auto-trading is enabled
      if (this.sessionConfig.enableAutoTrading) {
        await this.processAISignal(data);
      }

      // Check processing time to ensure 1-second requirement
      const processingTime = Date.now() - startTime;
      if (processingTime > 1000) {
        console.warn(`Market data processing for ${data.symbol} took ${processingTime}ms (exceeds 1-second requirement)`);
      }

    } catch (error) {
      this.errorHandler.logError(error as Error, `Process market data for ${data.symbol}`);
      
      // Don't throw error to prevent stopping the entire pipeline
      this.emit('marketDataError', {
        symbol: data.symbol,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Execute trading signal - implements AI signal processing and trade execution flow
   */
  async executeTradeSignal(signal: TradingSignal): Promise<void> {
    try {
      if (!this.state.isRunning) {
        console.log('Trading session not running, ignoring signal');
        return;
      }

      console.log(`Processing trading signal for ${signal.symbol}: ${signal.action} (confidence: ${signal.confidence})`);

      // Validate signal
      if (!this.validateTradingSignal(signal)) {
        throw new Error(`Invalid trading signal for ${signal.symbol}`);
      }

      // Check if we should process this signal
      if (signal.action === 'hold' || signal.confidence < 0.6) {
        console.log(`Skipping signal for ${signal.symbol}: action=${signal.action}, confidence=${signal.confidence}`);
        return;
      }

      // Get current account balance
      const accountBalance = await this.gateService.getAccountBalance();
      const usdtBalance = accountBalance['USDT']?.available || 0;

      // Calculate position size using risk management
      const positionSize = this.riskService.calculatePositionSize(signal, usdtBalance);

      if (positionSize <= 0) {
        console.log(`Position size calculation returned 0 for ${signal.symbol}`);
        return;
      }

      // Create trade request
      const tradeRequest = {
        symbol: signal.symbol,
        side: signal.action as 'buy' | 'sell',
        amount: positionSize / signal.targetPrice, // Convert USD amount to base currency amount
        price: signal.targetPrice,
        signal
      };

      // Validate trade against risk parameters
      const isValidTrade = await this.riskService.validateTrade(tradeRequest);
      if (!isValidTrade) {
        console.log(`Trade validation failed for ${signal.symbol}`);
        return;
      }

      // Execute the trade
      await this.executeTrade(tradeRequest);
      
      this.state.lastSignalProcessed = new Date();
      this.state.totalTrades++;

    } catch (error) {
      this.errorHandler.logError(error as Error, `Execute trade signal for ${signal.symbol}`);
      
      this.emit('tradeExecutionError', {
        signal,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Update positions with current market data
   */
  async updatePositions(): Promise<void> {
    try {
      if (!this.state.isRunning) {
        return;
      }

      // Get current positions from exchange
      const exchangePositions = await this.gateService.getOpenPositions();
      
      // Update internal position tracking
      for (const position of exchangePositions) {
        this.activePositions.set(position.id, position);
        
        // Update risk management service
        this.riskService.updatePosition(position);
        
        // Update automated trading logic
        this.autoTradingLogic.updatePosition(position);
        
        // Check for stop-loss triggers
        if (this.riskService.checkStopLoss(position)) {
          await this.handleStopLoss(position);
        }
      }

      // Remove closed positions
      for (const [positionId, position] of this.activePositions) {
        const stillOpen = exchangePositions.find(p => p.id === positionId);
        if (!stillOpen) {
          this.activePositions.delete(positionId);
          this.riskService.removePosition(positionId);
          
          // Update automated trading logic with closed position
          const closedPosition = { ...position, status: 'closed' as const };
          this.autoTradingLogic.updatePosition(closedPosition);
        }
      }

      this.state.activePositions = this.activePositions.size;

      this.emit('positionsUpdated', {
        activePositions: Array.from(this.activePositions.values()),
        timestamp: new Date()
      });

    } catch (error) {
      this.errorHandler.logError(error as Error, 'Update positions');
    }
  }

  /**
   * Get current trading engine state
   */
  getState(): TradingEngineState {
    return { ...this.state };
  }

  /**
   * Get gate service instance
   */
  getGateService(): GateExchangeService {
    return this.gateService;
  }

  /**
   * Get session configuration
   */
  getSessionConfig(): TradingSessionConfig {
    return { ...this.sessionConfig };
  }

  /**
   * Get risk service instance
   */
  getRiskService(): RiskManagementService {
    return this.riskService;
  }

  /**
   * Get error handler instance
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * Get active positions
   */
  getActivePositions(): TradingPosition[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * Get cached market data
   */
  getMarketData(symbol?: string): MarketData | Map<string, MarketData> {
    if (symbol) {
      return this.marketDataCache.get(symbol) || null;
    }
    return new Map(this.marketDataCache);
  }

  /**
   * Update session configuration
   */
  updateSessionConfig(newConfig: Partial<TradingSessionConfig>): void {
    this.sessionConfig = { ...this.sessionConfig, ...newConfig };
    
    if (this.state.isRunning) {
      // Restart periodic processes with new configuration
      this.stopPeriodicProcesses();
      this.startPeriodicProcesses();
    }
  }

  /**
   * Get recovery system status
   */
  getRecoveryStatus(): {
    connectionStatus: any;
    errorStatistics: any;
    isInRecoveryMode: boolean;
    systemState: SystemState;
  } {
    return {
      connectionStatus: this.recoverySystem.getConnectionStatus(),
      errorStatistics: this.recoverySystem.getErrorStatistics(),
      isInRecoveryMode: this.recoverySystem.isInRecoveryMode(),
      systemState: this.recoverySystem.getSystemState()
    };
  }

  /**
   * Force recovery for a specific service
   */
  async forceServiceRecovery(serviceName: string): Promise<boolean> {
    return await this.recoverySystem.forceRecovery(serviceName);
  }

  /**
   * Reset error tracking for a service
   */
  resetServiceErrors(serviceName: string): void {
    this.recoverySystem.resetErrorTracking(serviceName);
  }

  /**
   * Validate all required services are ready
   */
  private async validateServices(): Promise<void> {
    // Validate Nebius AI service
    if (!this.nebiusService.isServiceAuthenticated || !await this.nebiusService.authenticate()) {
      throw new Error('Nebius AI service authentication failed');
    }

    // Validate Gate.io service
    if (!await this.gateService.authenticate()) {
      throw new Error('Gate.io service authentication failed');
    }

    console.log('All services validated successfully');
  }

  /**
   * Initialize market data processing pipeline
   */
  private async initializeMarketDataPipeline(): Promise<void> {
    // Set up market data event handler
    this.marketDataService.onMarketDataUpdate((data: MarketData) => {
      this.processMarketData(data);
    });

    // Start real-time market data collection
    await this.marketDataService.startRealTimeCollection();

    console.log('Market data pipeline initialized');
  }

  /**
   * Process AI signal from market data
   */
  private async processAISignal(marketData: MarketData): Promise<void> {
    try {
      // Check if we already have a pending signal for this symbol
      if (this.pendingSignals.has(marketData.symbol)) {
        return;
      }

      // Get AI analysis
      const signal = await this.nebiusService.analyzeMarket(marketData);
      
      // Add signal to automated trading logic
      this.autoTradingLogic.addSignal(signal);
      
      // Process signal through automated trading logic
      let decision: TradingDecision | null = null;
      
      if (signal.action === 'buy') {
        decision = await this.autoTradingLogic.processBuySignal(signal, marketData);
      } else if (signal.action === 'sell') {
        decision = await this.autoTradingLogic.processSellSignal(signal, marketData);
      }
      
      // Execute decision if valid
      if (decision && decision.action !== 'hold') {
        await this.executeTradingDecision(decision);
      }
      
      // Store pending signal for fallback processing
      this.pendingSignals.set(marketData.symbol, signal);

    } catch (error) {
      this.errorHandler.logError(error as Error, `Process AI signal for ${marketData.symbol}`);
      this.pendingSignals.delete(marketData.symbol);
    }
  }

  /**
   * Execute trading decision from automated trading logic
   */
  private async executeTradingDecision(decision: TradingDecision): Promise<void> {
    try {
      console.log(`Executing trading decision: ${decision.action} ${decision.amount} ${decision.symbol} - ${decision.reasoning}`);

      let tradeExecution: TradeExecution;

      if (decision.action === 'buy') {
        tradeExecution = await this.gateService.placeBuyOrder(
          decision.symbol,
          decision.amount,
          decision.price
        );
      } else if (decision.action === 'sell') {
        tradeExecution = await this.gateService.placeSellOrder(
          decision.symbol,
          decision.amount,
          decision.price
        );
      } else {
        console.log(`Unsupported trading action: ${decision.action}`);
        return;
      }

      this.emit('tradingDecisionExecuted', {
        decision,
        tradeExecution,
        timestamp: new Date()
      });

      this.state.totalTrades++;
      console.log(`Trading decision executed: ${decision.action} ${decision.amount} ${decision.symbol} at ${decision.price}`);

    } catch (error) {
      this.errorHandler.logError(error as Error, `Execute trading decision for ${decision.symbol}`);
      
      this.emit('tradingDecisionError', {
        decision,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Execute actual trade based on trade request (legacy method for backward compatibility)
   */
  private async executeTrade(tradeRequest: any): Promise<void> {
    try {
      let tradeExecution: TradeExecution;

      if (tradeRequest.side === 'buy') {
        tradeExecution = await this.gateService.placeBuyOrder(
          tradeRequest.symbol,
          tradeRequest.amount,
          tradeRequest.price
        );
      } else {
        tradeExecution = await this.gateService.placeSellOrder(
          tradeRequest.symbol,
          tradeRequest.amount,
          tradeRequest.price
        );
      }

      this.emit('tradeExecuted', {
        tradeExecution,
        signal: tradeRequest.signal,
        timestamp: new Date()
      });

      console.log(`Trade executed: ${tradeRequest.side} ${tradeRequest.amount} ${tradeRequest.symbol} at ${tradeRequest.price}`);

    } catch (error) {
      this.errorHandler.logError(error as Error, `Execute ${tradeRequest.side} trade for ${tradeRequest.symbol}`);
      throw error;
    }
  }

  /**
   * Handle stop-loss trigger
   */
  private async handleStopLoss(position: TradingPosition): Promise<void> {
    try {
      console.log(`Stop-loss triggered for position ${position.id} on ${position.symbol}`);
      
      // Execute sell order to close position
      const sellOrder = await this.gateService.placeSellOrder(
        position.symbol,
        position.amount,
        position.currentPrice * 0.99 // Sell slightly below current price for quick execution
      );

      this.emit('stopLossTriggered', {
        position,
        sellOrder,
        timestamp: new Date()
      });

    } catch (error) {
      this.errorHandler.logError(error as Error, `Handle stop-loss for position ${position.id}`);
    }
  }

  /**
   * Validate trading signal
   */
  private validateTradingSignal(signal: TradingSignal): boolean {
    return (
      signal &&
      typeof signal.symbol === 'string' &&
      ['buy', 'sell', 'hold'].includes(signal.action) &&
      typeof signal.confidence === 'number' &&
      signal.confidence >= 0 && signal.confidence <= 1 &&
      typeof signal.targetPrice === 'number' &&
      signal.targetPrice > 0
    );
  }

  /**
   * Start periodic processes
   */
  private startPeriodicProcesses(): void {
    // Signal processing interval
    this.signalProcessingTimer = setInterval(async () => {
      try {
        // Process any pending signals
        for (const [symbol, signal] of this.pendingSignals) {
          await this.executeTradeSignal(signal);
        }
      } catch (error) {
        this.errorHandler.logError(error as Error, 'Periodic signal processing');
      }
    }, this.sessionConfig.signalProcessingInterval);

    // Position update interval
    this.positionUpdateTimer = setInterval(async () => {
      await this.updatePositions();
    }, this.sessionConfig.positionUpdateInterval);

    // Risk monitoring interval
    this.riskMonitoringTimer = setInterval(async () => {
      await this.riskService.enforceRiskLimits();
    }, 60000); // Check risk limits every minute

    console.log('Periodic processes started');
  }

  /**
   * Stop periodic processes
   */
  private stopPeriodicProcesses(): void {
    if (this.signalProcessingTimer) {
      clearInterval(this.signalProcessingTimer);
      this.signalProcessingTimer = null;
    }

    if (this.positionUpdateTimer) {
      clearInterval(this.positionUpdateTimer);
      this.positionUpdateTimer = null;
    }

    if (this.riskMonitoringTimer) {
      clearInterval(this.riskMonitoringTimer);
      this.riskMonitoringTimer = null;
    }

    console.log('Periodic processes stopped');
  }

  /**
   * Setup event handlers for internal coordination
   */
  private setupEventHandlers(): void {
    // Handle market data service events
    this.marketDataService.on('subscribed', (symbol: string) => {
      console.log(`Market data subscription active for ${symbol}`);
    });

    this.marketDataService.on('unsubscribed', (symbol: string) => {
      console.log(`Market data subscription ended for ${symbol}`);
    });

    // Handle automated trading logic events
    this.autoTradingLogic.on('tradingDecision', async (decision: TradingDecision) => {
      if (this.sessionConfig.enableAutoTrading && decision.action !== 'hold') {
        await this.executeTradingDecision(decision);
      }
    });

    this.autoTradingLogic.on('rebalanceRecommendation', (decision: TradingDecision) => {
      console.log(`Rebalance recommendation: ${decision.reasoning}`);
      this.emit('rebalanceRecommendation', decision);
    });

    this.autoTradingLogic.on('monitoringStarted', () => {
      console.log('Automated trading monitoring started');
    });

    this.autoTradingLogic.on('monitoringStopped', () => {
      console.log('Automated trading monitoring stopped');
    });

    // Handle recovery system events
    this.recoverySystem.on('recoverySuccess', (data) => {
      console.log(`Service recovery successful: ${data.service}`);
      this.emit('serviceRecovered', data);
    });

    this.recoverySystem.on('recoveryFailed', (data) => {
      console.log(`Service recovery failed: ${data.service}`);
      this.emit('serviceRecoveryFailed', data);
    });

    this.recoverySystem.on('networkError', (data) => {
      console.log(`Network error detected: ${data.error.message}`);
      this.emit('networkError', data);
    });

    this.recoverySystem.on('networkRecoverySuccess', () => {
      console.log('Network connectivity restored');
      this.emit('networkRestored');
    });

    this.recoverySystem.on('circuitBreakerOpened', (data) => {
      console.log(`Circuit breaker opened for ${data.service} - too many failures`);
      this.emit('circuitBreakerOpened', data);
    });

    this.recoverySystem.on('authenticationError', (data) => {
      console.log(`Authentication error for ${data.service}: ${data.error}`);
      this.emit('authenticationError', data);
    });

    this.recoverySystem.on('rateLimitError', (data) => {
      console.log(`Rate limit error for ${data.service}: ${data.error}`);
      this.emit('rateLimitError', data);
    });

    this.recoverySystem.on('connectionStatusUpdate', (status) => {
      this.emit('connectionStatusUpdate', status);
    });

    // Handle internal events
    this.on('tradeExecuted', (data) => {
      console.log(`Trade executed: ${data.tradeExecution.side} ${data.tradeExecution.amount} ${data.tradeExecution.symbol}`);
      
      // Update system state with new trade
      this.recoverySystem.updateSystemState({
        activePositions: Array.from(this.activePositions.values()),
        pendingSignals: Array.from(this.pendingSignals.values()),
        marketDataCache: Object.fromEntries(this.marketDataCache)
      });
    });

    this.on('tradingDecisionExecuted', (data) => {
      console.log(`Automated trading decision executed: ${data.decision.action} ${data.decision.symbol}`);
    });

    this.on('stopLossTriggered', (data) => {
      console.log(`Stop-loss executed for ${data.position.symbol}`);
    });

    // Handle market data errors
    this.on('marketDataError', (data) => {
      console.log(`Market data error for ${data.symbol}: ${data.error}`);
    });

    // Handle trade execution errors
    this.on('tradeExecutionError', (data) => {
      console.log(`Trade execution error for ${data.signal.symbol}: ${data.error}`);
    });
  }
}