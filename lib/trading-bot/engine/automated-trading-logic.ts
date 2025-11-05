// Automated Trading Logic Implementation
// Implements buy/sell signal processing with position sizing,
// continuous market monitoring and decision making

import { EventEmitter } from 'events';
import {
  TradingSignal,
  TradingPosition,
  TradeExecution,
  MarketData,
  GateExchangeService,
  RiskManagementService,
  ErrorHandler
} from '../types';

export interface AutoTradingConfig {
  minConfidenceThreshold: number;
  maxPositionsPerSymbol: number;
  positionSizePercentage: number;
  enableBuySignals: boolean;
  enableSellSignals: boolean;
  enableContinuousMonitoring: boolean;
  monitoringInterval: number;
  rebalanceThreshold: number;
}

export interface TradingDecision {
  action: 'buy' | 'sell' | 'hold' | 'rebalance';
  symbol: string;
  amount: number;
  price: number;
  reasoning: string;
  confidence: number;
  timestamp: Date;
}

export interface PositionAnalysis {
  symbol: string;
  currentPosition: TradingPosition | null;
  marketData: MarketData;
  signal: TradingSignal;
  recommendation: TradingDecision;
}

export class AutomatedTradingLogic extends EventEmitter {
  private config: AutoTradingConfig;
  private gateService: GateExchangeService;
  private riskService: RiskManagementService;
  private errorHandler: ErrorHandler;
  
  // State tracking
  private activePositions: Map<string, TradingPosition> = new Map();
  private recentSignals: Map<string, TradingSignal[]> = new Map();
  private marketDataCache: Map<string, MarketData> = new Map();
  private lastDecisionTime: Map<string, Date> = new Map();
  
  // Monitoring
  private monitoringTimer: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor(
    config: AutoTradingConfig,
    gateService: GateExchangeService,
    riskService: RiskManagementService,
    errorHandler: ErrorHandler
  ) {
    super();
    
    this.config = {
      ...config,
      minConfidenceThreshold: config.minConfidenceThreshold ?? 0.6,
      maxPositionsPerSymbol: config.maxPositionsPerSymbol ?? 1,
      positionSizePercentage: config.positionSizePercentage ?? 0.1,
      enableBuySignals: config.enableBuySignals ?? true,
      enableSellSignals: config.enableSellSignals ?? true,
      enableContinuousMonitoring: config.enableContinuousMonitoring ?? true,
      monitoringInterval: config.monitoringInterval ?? 30000,
      rebalanceThreshold: config.rebalanceThreshold ?? 0.05
    };
    
    this.gateService = gateService;
    this.riskService = riskService;
    this.errorHandler = errorHandler;
  }

  /**
   * Process buy signal with position sizing
   * Requirements: 4.1, 4.2, 4.3
   */
  async processBuySignal(signal: TradingSignal, marketData: MarketData): Promise<TradingDecision | null> {
    try {
      if (!this.config.enableBuySignals) {
        return null;
      }

      // Validate signal confidence
      if (signal.confidence < this.config.minConfidenceThreshold) {
        return {
          action: 'hold',
          symbol: signal.symbol,
          amount: 0,
          price: marketData.price,
          reasoning: `Signal confidence ${signal.confidence} below threshold ${this.config.minConfidenceThreshold}`,
          confidence: signal.confidence,
          timestamp: new Date()
        };
      }

      // Check existing positions for this symbol
      const existingPosition = this.activePositions.get(signal.symbol);
      if (existingPosition && existingPosition.side === 'buy') {
        return await this.considerPositionIncrease(existingPosition, signal, marketData);
      }

      // Check maximum positions per symbol
      const symbolPositions = Array.from(this.activePositions.values())
        .filter(pos => pos.symbol === signal.symbol && pos.status === 'open');
      
      if (symbolPositions.length >= this.config.maxPositionsPerSymbol) {
        return {
          action: 'hold',
          symbol: signal.symbol,
          amount: 0,
          price: marketData.price,
          reasoning: `Maximum positions (${this.config.maxPositionsPerSymbol}) reached for ${signal.symbol}`,
          confidence: signal.confidence,
          timestamp: new Date()
        };
      }

      // Get account balance for position sizing
      const accountBalance = await this.gateService.getAccountBalance();
      const usdtBalance = accountBalance['USDT']?.available || 0;

      if (usdtBalance < 10) { // Minimum $10 balance required
        return {
          action: 'hold',
          symbol: signal.symbol,
          amount: 0,
          price: marketData.price,
          reasoning: 'Insufficient balance for new position',
          confidence: signal.confidence,
          timestamp: new Date()
        };
      }

      // Calculate position size using risk management
      const positionSize = this.riskService.calculatePositionSize(signal, usdtBalance);
      const baseAmount = positionSize / signal.targetPrice;

      // Validate trade request
      const tradeRequest = {
        symbol: signal.symbol,
        side: 'buy' as const,
        amount: baseAmount,
        price: signal.targetPrice,
        signal
      };

      const isValidTrade = await this.riskService.validateTrade(tradeRequest);
      if (!isValidTrade) {
        return {
          action: 'hold',
          symbol: signal.symbol,
          amount: 0,
          price: marketData.price,
          reasoning: 'Trade validation failed - risk limits exceeded',
          confidence: signal.confidence,
          timestamp: new Date()
        };
      }

      return {
        action: 'buy',
        symbol: signal.symbol,
        amount: baseAmount,
        price: signal.targetPrice,
        reasoning: `Buy signal with ${(signal.confidence * 100).toFixed(1)}% confidence. ${signal.reasoning}`,
        confidence: signal.confidence,
        timestamp: new Date()
      };

    } catch (error) {
      this.errorHandler.logError(error as Error, `Process buy signal for ${signal.symbol}`);
      return null;
    }
  }

  /**
   * Process sell signal for existing positions
   * Requirements: 4.1, 4.2, 4.3
   */
  async processSellSignal(signal: TradingSignal, marketData: MarketData): Promise<TradingDecision | null> {
    try {
      if (!this.config.enableSellSignals) {
        return null;
      }

      // Check if we have an open position to sell
      const existingPosition = this.activePositions.get(signal.symbol);
      if (!existingPosition || existingPosition.side !== 'buy' || existingPosition.status !== 'open') {
        return {
          action: 'hold',
          symbol: signal.symbol,
          amount: 0,
          price: marketData.price,
          reasoning: 'No open buy position to sell',
          confidence: signal.confidence,
          timestamp: new Date()
        };
      }

      // Validate signal confidence
      if (signal.confidence < this.config.minConfidenceThreshold) {
        return {
          action: 'hold',
          symbol: signal.symbol,
          amount: 0,
          price: marketData.price,
          reasoning: `Sell signal confidence ${signal.confidence} below threshold ${this.config.minConfidenceThreshold}`,
          confidence: signal.confidence,
          timestamp: new Date()
        };
      }

      // Calculate potential profit/loss
      const currentValue = existingPosition.amount * marketData.price;
      const entryValue = existingPosition.amount * existingPosition.entryPrice;
      const unrealizedPnL = currentValue - entryValue;
      const pnlPercentage = (unrealizedPnL / entryValue) * 100;

      // Check if position is profitable or if stop-loss should trigger
      const shouldSell = this.shouldExecuteSell(existingPosition, signal, marketData, pnlPercentage);
      
      if (!shouldSell.execute) {
        return {
          action: 'hold',
          symbol: signal.symbol,
          amount: 0,
          price: marketData.price,
          reasoning: shouldSell.reason,
          confidence: signal.confidence,
          timestamp: new Date()
        };
      }

      // Determine sell amount (full position or partial)
      const sellAmount = this.calculateSellAmount(existingPosition, signal, pnlPercentage);

      return {
        action: 'sell',
        symbol: signal.symbol,
        amount: sellAmount,
        price: signal.targetPrice,
        reasoning: `Sell signal: ${shouldSell.reason}. P&L: ${pnlPercentage.toFixed(2)}%`,
        confidence: signal.confidence,
        timestamp: new Date()
      };

    } catch (error) {
      this.errorHandler.logError(error as Error, `Process sell signal for ${signal.symbol}`);
      return null;
    }
  }

  /**
   * Continuous market monitoring and decision making
   * Requirements: 4.1, 4.2, 4.3
   */
  async startContinuousMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Continuous monitoring is already active');
      return;
    }

    if (!this.config.enableContinuousMonitoring) {
      console.log('Continuous monitoring is disabled');
      return;
    }

    this.isMonitoring = true;
    
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.performContinuousAnalysis();
      } catch (error) {
        this.errorHandler.logError(error as Error, 'Continuous monitoring');
      }
    }, this.config.monitoringInterval);

    console.log(`Continuous monitoring started with ${this.config.monitoringInterval}ms interval`);
    this.emit('monitoringStarted', { timestamp: new Date() });
  }

  /**
   * Stop continuous monitoring
   */
  stopContinuousMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    this.isMonitoring = false;
    console.log('Continuous monitoring stopped');
    this.emit('monitoringStopped', { timestamp: new Date() });
  }

  /**
   * Update position information
   */
  updatePosition(position: TradingPosition): void {
    if (position.status === 'open') {
      this.activePositions.set(position.symbol, position);
    } else {
      this.activePositions.delete(position.symbol);
    }
  }

  /**
   * Update market data cache
   */
  updateMarketData(marketData: MarketData): void {
    this.marketDataCache.set(marketData.symbol, marketData);
  }

  /**
   * Add trading signal to recent signals history
   */
  addSignal(signal: TradingSignal): void {
    if (!this.recentSignals.has(signal.symbol)) {
      this.recentSignals.set(signal.symbol, []);
    }

    const signals = this.recentSignals.get(signal.symbol)!;
    signals.push(signal);

    // Keep only last 10 signals per symbol
    if (signals.length > 10) {
      signals.shift();
    }
  }

  /**
   * Get trading statistics
   */
  getTradingStats(): {
    activePositions: number;
    totalSymbols: number;
    monitoringActive: boolean;
    lastDecisions: { [symbol: string]: Date };
  } {
    return {
      activePositions: this.activePositions.size,
      totalSymbols: this.marketDataCache.size,
      monitoringActive: this.isMonitoring,
      lastDecisions: Object.fromEntries(this.lastDecisionTime)
    };
  }

  /**
   * Perform continuous analysis of all positions and market data
   */
  private async performContinuousAnalysis(): Promise<void> {
    try {
      // Update all positions from exchange
      const currentPositions = await this.gateService.getOpenPositions();
      
      // Update internal position tracking
      for (const position of currentPositions) {
        this.updatePosition(position);
      }

      // Analyze each symbol with market data
      for (const [symbol, marketData] of this.marketDataCache) {
        await this.analyzeSymbolContinuously(symbol, marketData);
      }

      // Check for rebalancing opportunities
      await this.checkRebalancingOpportunities();

    } catch (error) {
      this.errorHandler.logError(error as Error, 'Perform continuous analysis');
    }
  }

  /**
   * Analyze individual symbol continuously
   */
  private async analyzeSymbolContinuously(symbol: string, marketData: MarketData): Promise<void> {
    try {
      const position = this.activePositions.get(symbol);
      const recentSignals = this.recentSignals.get(symbol) || [];
      
      // Skip if no recent signals
      if (recentSignals.length === 0) {
        return;
      }

      const latestSignal = recentSignals[recentSignals.length - 1];
      
      // Skip if signal is too old (more than 5 minutes)
      const signalAge = Date.now() - latestSignal.timestamp.getTime();
      if (signalAge > 300000) {
        return;
      }

      // Check if we need to make a decision
      const lastDecision = this.lastDecisionTime.get(symbol);
      if (lastDecision && Date.now() - lastDecision.getTime() < 60000) {
        return; // Wait at least 1 minute between decisions for same symbol
      }

      // Analyze current situation
      let decision: TradingDecision | null = null;

      if (position && position.status === 'open') {
        // We have an open position - check if we should sell or hold
        if (latestSignal.action === 'sell') {
          decision = await this.processSellSignal(latestSignal, marketData);
        } else {
          // Check for stop-loss or take-profit conditions
          decision = await this.checkPositionManagement(position, marketData);
        }
      } else {
        // No position - check if we should buy
        if (latestSignal.action === 'buy') {
          decision = await this.processBuySignal(latestSignal, marketData);
        }
      }

      if (decision && decision.action !== 'hold') {
        this.lastDecisionTime.set(symbol, new Date());
        this.emit('tradingDecision', decision);
      }

    } catch (error) {
      this.errorHandler.logError(error as Error, `Analyze symbol ${symbol} continuously`);
    }
  }

  /**
   * Check position management (stop-loss, take-profit)
   */
  private async checkPositionManagement(position: TradingPosition, marketData: MarketData): Promise<TradingDecision | null> {
    const currentPrice = marketData.price;
    const entryPrice = position.entryPrice;
    const pnlPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;

    // Check stop-loss
    if (this.riskService.checkStopLoss(position)) {
      return {
        action: 'sell',
        symbol: position.symbol,
        amount: position.amount,
        price: currentPrice * 0.99, // Sell slightly below market for quick execution
        reasoning: 'Stop-loss triggered',
        confidence: 1.0,
        timestamp: new Date()
      };
    }

    // Check take-profit (if position is profitable by more than 10%)
    if (pnlPercentage > 10) {
      return {
        action: 'sell',
        symbol: position.symbol,
        amount: position.amount * 0.5, // Sell half position to lock in profits
        price: currentPrice,
        reasoning: `Take profit at ${pnlPercentage.toFixed(2)}% gain`,
        confidence: 0.8,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Check for rebalancing opportunities
   */
  private async checkRebalancingOpportunities(): Promise<void> {
    try {
      const accountBalance = await this.gateService.getAccountBalance();
      const totalValue = this.calculateTotalPortfolioValue(accountBalance);

      for (const [symbol, position] of this.activePositions) {
        const marketData = this.marketDataCache.get(symbol);
        if (!marketData) continue;

        const positionValue = position.amount * marketData.price;
        const positionPercentage = positionValue / totalValue;

        // If position is more than 30% of portfolio, consider rebalancing
        if (positionPercentage > 0.3) {
          const rebalanceDecision: TradingDecision = {
            action: 'rebalance',
            symbol,
            amount: position.amount * 0.3, // Sell 30% of position
            price: marketData.price,
            reasoning: `Position is ${(positionPercentage * 100).toFixed(1)}% of portfolio - rebalancing`,
            confidence: 0.7,
            timestamp: new Date()
          };

          this.emit('rebalanceRecommendation', rebalanceDecision);
        }
      }

    } catch (error) {
      this.errorHandler.logError(error as Error, 'Check rebalancing opportunities');
    }
  }

  /**
   * Consider increasing existing position
   */
  private async considerPositionIncrease(
    position: TradingPosition,
    signal: TradingSignal,
    marketData: MarketData
  ): Promise<TradingDecision> {
    const currentPrice = marketData.price;
    const entryPrice = position.entryPrice;
    const pnlPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;

    // Only increase position if current position is profitable and signal is very confident
    if (pnlPercentage > 2 && signal.confidence > 0.8) {
      const accountBalance = await this.gateService.getAccountBalance();
      const usdtBalance = accountBalance['USDT']?.available || 0;
      
      if (usdtBalance > 50) { // Minimum $50 for position increase
        const additionalSize = Math.min(
          this.riskService.calculatePositionSize(signal, usdtBalance) * 0.5, // Half normal size for increases
          position.amount * 0.3 // Max 30% increase of current position
        );

        return {
          action: 'buy',
          symbol: signal.symbol,
          amount: additionalSize / signal.targetPrice,
          price: signal.targetPrice,
          reasoning: `Increase position - current P&L: ${pnlPercentage.toFixed(2)}%, high confidence signal`,
          confidence: signal.confidence,
          timestamp: new Date()
        };
      }
    }

    return {
      action: 'hold',
      symbol: signal.symbol,
      amount: 0,
      price: currentPrice,
      reasoning: 'Existing position - conditions not met for increase',
      confidence: signal.confidence,
      timestamp: new Date()
    };
  }

  /**
   * Determine if sell should be executed
   */
  private shouldExecuteSell(
    position: TradingPosition,
    signal: TradingSignal,
    marketData: MarketData,
    pnlPercentage: number
  ): { execute: boolean; reason: string } {
    // Always sell if stop-loss triggered
    if (this.riskService.checkStopLoss(position)) {
      return { execute: true, reason: 'Stop-loss triggered' };
    }

    // Sell if signal is very confident and position is profitable
    if (signal.confidence > 0.8 && pnlPercentage > 1) {
      return { execute: true, reason: 'High confidence sell signal with profit' };
    }

    // Sell if position is significantly profitable (>15%)
    if (pnlPercentage > 15) {
      return { execute: true, reason: 'Taking profits at significant gain' };
    }

    // Sell if position is losing and signal confidence is high
    if (pnlPercentage < -5 && signal.confidence > 0.7) {
      return { execute: true, reason: 'Cutting losses with confident sell signal' };
    }

    return { execute: false, reason: 'Conditions not met for sell execution' };
  }

  /**
   * Calculate sell amount based on position and market conditions
   */
  private calculateSellAmount(position: TradingPosition, signal: TradingSignal, pnlPercentage: number): number {
    // Full position if stop-loss or significant loss
    if (this.riskService.checkStopLoss(position) || pnlPercentage < -10) {
      return position.amount;
    }

    // Partial sell if taking profits
    if (pnlPercentage > 10) {
      return position.amount * 0.6; // Sell 60% to lock in profits
    }

    // Full position for high confidence signals
    if (signal.confidence > 0.9) {
      return position.amount;
    }

    // Default to half position
    return position.amount * 0.5;
  }

  /**
   * Calculate total portfolio value
   */
  private calculateTotalPortfolioValue(accountBalance: any): number {
    let totalValue = 0;

    // Add USDT balance
    totalValue += accountBalance['USDT']?.available || 0;

    // Add value of all positions
    for (const [symbol, position] of this.activePositions) {
      const marketData = this.marketDataCache.get(symbol);
      if (marketData) {
        totalValue += position.amount * marketData.price;
      }
    }

    return totalValue;
  }
}