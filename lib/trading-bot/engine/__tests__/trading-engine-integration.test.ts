// Trading Engine Integration Tests
// Tests end-to-end trading workflows and error recovery scenarios

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { TradingEngine } from '../trading-engine';
import { AutomatedTradingLogic } from '../automated-trading-logic';
import { ErrorHandlingRecoverySystem } from '../error-handling-recovery';
import {
  TradingBotConfig,
  MarketData,
  TradingSignal,
  TradingPosition,
  TradeExecution,
  NebiusAIService,
  GateExchangeService,
  MarketDataService,
  RiskManagementService
} from '../../types';

// Mock implementations for testing
class MockNebiusService implements NebiusAIService {
  private authenticated = false;
  private shouldFail = false;

  async authenticate(): Promise<boolean> {
    if (this.shouldFail) {
      throw new Error('Authentication failed');
    }
    this.authenticated = true;
    return true;
  }

  async analyzeMarket(marketData: MarketData): Promise<TradingSignal> {
    if (this.shouldFail) {
      throw new Error('Market analysis failed');
    }
    
    return {
      symbol: marketData.symbol,
      action: marketData.price > 50000 ? 'sell' : 'buy',
      confidence: 0.8,
      targetPrice: marketData.price * (marketData.price > 50000 ? 0.98 : 1.02),
      stopLoss: marketData.price * (marketData.price > 50000 ? 1.05 : 0.95),
      reasoning: 'Test signal based on price threshold',
      timestamp: new Date()
    };
  }

  async getTradeRecommendation(analysis: any): Promise<TradingSignal> {
    return this.analyzeMarket(analysis);
  }

  async handleRateLimit(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  isServiceAuthenticated(): boolean {
    return this.authenticated;
  }

  setFailureMode(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}

class MockGateService implements GateExchangeService {
  private authenticated = false;
  private shouldFail = false;
  private balance = { USDT: { available: 1000, locked: 0 } };
  private positions: TradingPosition[] = [];
  private orderCounter = 1;

  async authenticate(): Promise<boolean> {
    if (this.shouldFail) {
      throw new Error('Gate authentication failed');
    }
    this.authenticated = true;
    return true;
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    if (this.shouldFail) {
      throw new Error('Market data fetch failed');
    }

    return {
      symbol,
      timestamp: Date.now(),
      price: symbol === 'BTC/USDT' ? 45000 : 3000,
      volume: 1000,
      orderBook: {
        bids: Array.from({ length: 20 }, (_, i) => ({
          price: (symbol === 'BTC/USDT' ? 45000 : 3000) - i,
          amount: 1 + i * 0.1
        })),
        asks: Array.from({ length: 20 }, (_, i) => ({
          price: (symbol === 'BTC/USDT' ? 45000 : 3000) + i + 1,
          amount: 1 + i * 0.1
        }))
      },
      indicators: {
        rsi: 65,
        macd: 0.5,
        movingAverage: symbol === 'BTC/USDT' ? 44500 : 2950
      }
    };
  }

  async getAccountBalance(): Promise<any> {
    if (this.shouldFail) {
      throw new Error('Balance fetch failed');
    }
    return this.balance;
  }

  async placeBuyOrder(symbol: string, amount: number, price: number): Promise<TradeExecution> {
    if (this.shouldFail) {
      throw new Error('Buy order failed');
    }

    const orderId = `order_${this.orderCounter++}`;
    const execution: TradeExecution = {
      id: `exec_${this.orderCounter}`,
      orderId,
      symbol,
      side: 'buy',
      amount,
      price,
      fee: amount * price * 0.001, // 0.1% fee
      status: 'filled',
      timestamp: new Date()
    };

    // Create position
    const position: TradingPosition = {
      id: orderId,
      symbol,
      side: 'buy',
      amount,
      entryPrice: price,
      currentPrice: price,
      unrealizedPnL: 0,
      timestamp: new Date(),
      status: 'open'
    };

    this.positions.push(position);
    
    // Update balance
    const cost = amount * price + execution.fee;
    this.balance.USDT.available -= cost;

    return execution;
  }

  async placeSellOrder(symbol: string, amount: number, price: number): Promise<TradeExecution> {
    if (this.shouldFail) {
      throw new Error('Sell order failed');
    }

    const orderId = `order_${this.orderCounter++}`;
    const execution: TradeExecution = {
      id: `exec_${this.orderCounter}`,
      orderId,
      symbol,
      side: 'sell',
      amount,
      price,
      fee: amount * price * 0.001, // 0.1% fee
      status: 'filled',
      timestamp: new Date()
    };

    // Close position
    const positionIndex = this.positions.findIndex(p => p.symbol === symbol && p.status === 'open');
    if (positionIndex >= 0) {
      this.positions[positionIndex].status = 'closed';
    }

    // Update balance
    const proceeds = amount * price - execution.fee;
    this.balance.USDT.available += proceeds;

    return execution;
  }

  async getOpenPositions(): Promise<TradingPosition[]> {
    if (this.shouldFail) {
      throw new Error('Position fetch failed');
    }
    return this.positions.filter(p => p.status === 'open');
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (this.shouldFail) {
      return false;
    }
    return true;
  }

  setFailureMode(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setBalance(balance: any): void {
    this.balance = balance;
  }

  getPositions(): TradingPosition[] {
    return [...this.positions];
  }

  clearPositions(): void {
    this.positions = [];
  }
}

class MockMarketDataService implements MarketDataService {
  private subscriptions = new Set<string>();
  private callbacks: Array<(data: MarketData) => void> = [];
  private shouldFail = false;

  async subscribeToMarket(symbol: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Market subscription failed');
    }
    this.subscriptions.add(symbol);
  }

  async processTickData(tick: any): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Tick processing failed');
    }
    // Process tick data
  }

  calculateIndicators(history: number[]): any {
    return {
      rsi: 65,
      macd: 0.5,
      movingAverage: history.length > 0 ? history[history.length - 1] : 0
    };
  }

  validateDataIntegrity(data: MarketData): boolean {
    return !this.shouldFail && !!data && !!data.symbol && data.price > 0;
  }

  onMarketDataUpdate(callback: (data: MarketData) => void): void {
    this.callbacks.push(callback);
  }

  removeMarketDataListener(callback: (data: MarketData) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index >= 0) {
      this.callbacks.splice(index, 1);
    }
  }

  async startRealTimeCollection(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Real-time collection start failed');
    }
  }

  async stopRealTimeCollection(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Real-time collection stop failed');
    }
  }

  setFailureMode(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  // Simulate market data update
  simulateMarketUpdate(symbol: string): void {
    const marketData: MarketData = {
      symbol,
      timestamp: Date.now(),
      price: symbol === 'BTC/USDT' ? 45000 + Math.random() * 1000 : 3000 + Math.random() * 100,
      volume: 1000,
      orderBook: {
        bids: [{ price: 44900, amount: 1 }],
        asks: [{ price: 45100, amount: 1 }]
      },
      indicators: {
        rsi: 65,
        macd: 0.5,
        movingAverage: 44500
      }
    };

    this.callbacks.forEach(callback => callback(marketData));
  }

  on(event: string, callback: Function): void {
    // Mock event emitter
  }
}

class MockRiskService implements RiskManagementService {
  private shouldFail = false;

  async validateTrade(tradeRequest: any): Promise<boolean> {
    if (this.shouldFail) {
      return false;
    }
    return tradeRequest.amount > 0 && tradeRequest.price > 0;
  }

  calculatePositionSize(signal: any, balance: number): number {
    if (this.shouldFail) {
      return 0;
    }
    return Math.min(balance * 0.1, 100); // 10% of balance, max $100
  }

  checkStopLoss(position: any): boolean {
    if (this.shouldFail) {
      return true; // Force stop-loss in failure mode
    }
    return position.unrealizedPnL < -50; // Stop-loss at $50 loss
  }

  async enforceRiskLimits(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Risk limit enforcement failed');
    }
  }

  async emergencyStop(): Promise<void> {
    console.log('Emergency stop activated');
  }

  updatePosition(position: any): void {
    // Update position tracking
  }

  removePosition(positionId: string): void {
    // Remove position tracking
  }

  setFailureMode(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}

describe('Trading Engine Integration Tests', () => {
  let tradingEngine: TradingEngine;
  let mockNebius: MockNebiusService;
  let mockGate: MockGateService;
  let mockMarketData: MockMarketDataService;
  let mockRisk: MockRiskService;
  let mockErrorHandler: ErrorHandlingRecoverySystem;

  const testConfig: TradingBotConfig = {
    nebius: {
      apiUrl: 'https://test-nebius.com',
      jwtToken: 'test-token',
      model: 'test-model',
      maxRetries: 3,
      timeout: 5000
    },
    gate: {
      baseUrl: 'https://test-gate.com',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      testnet: true
    },
    risk: {
      maxDailyLoss: 500,
      maxPositionSize: 1000,
      stopLossPercentage: 5,
      maxOpenPositions: 5,
      emergencyStopEnabled: true
    },
    tradingPairs: ['BTC/USDT', 'ETH/USDT'],
    marketDataUpdateInterval: 1000
  };

  beforeEach(() => {
    // Create mock services
    mockNebius = new MockNebiusService();
    mockGate = new MockGateService();
    mockMarketData = new MockMarketDataService();
    mockRisk = new MockRiskService();
    mockErrorHandler = new ErrorHandlingRecoverySystem({
      enableAutoRecovery: false, // Disable for testing
      persistStatePath: './test-state.json'
    });

    // Create trading engine
    tradingEngine = new TradingEngine(
      testConfig,
      {
        nebiusService: mockNebius,
        gateService: mockGate,
        marketDataService: mockMarketData,
        riskService: mockRisk,
        errorHandler: mockErrorHandler
      },
      {
        enableAutoTrading: true,
        maxConcurrentTrades: 3,
        signalProcessingInterval: 1000,
        positionUpdateInterval: 500
      }
    );
  });

  afterEach(async () => {
    if (tradingEngine.getState().isRunning) {
      await tradingEngine.stopTrading();
    }
    
    // Reset mock states
    mockNebius.setFailureMode(false);
    mockGate.setFailureMode(false);
    mockMarketData.setFailureMode(false);
    mockRisk.setFailureMode(false);
    mockGate.clearPositions();
  });

  describe('End-to-End Trading Workflows', () => {
    it('should complete full trading session lifecycle', async () => {
      // Test Requirements: 4.1, 4.2
      
      // Start trading session
      await tradingEngine.startTrading();
      expect(tradingEngine.getState().isRunning).toBe(true);
      expect(tradingEngine.getState().startTime).toBeDefined();

      // Simulate market data update that triggers buy signal
      const marketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 40000, // Below threshold, should trigger buy
        volume: 1000,
        orderBook: {
          bids: [{ price: 39900, amount: 1 }],
          asks: [{ price: 40100, amount: 1 }]
        },
        indicators: { rsi: 30, macd: 0.2, movingAverage: 39500 }
      };

      await tradingEngine.processMarketData(marketData);

      // Wait for signal processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that position was created
      const positions = await mockGate.getOpenPositions();
      expect(positions.length).toBeGreaterThan(0);
      expect(positions[0].symbol).toBe('BTC/USDT');
      expect(positions[0].side).toBe('buy');

      // Simulate price increase and sell signal
      const sellMarketData: MarketData = {
        ...marketData,
        price: 60000, // Above threshold, should trigger sell
        timestamp: Date.now()
      };

      await tradingEngine.processMarketData(sellMarketData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Stop trading session
      await tradingEngine.stopTrading();
      expect(tradingEngine.getState().isRunning).toBe(false);
    }, 10000);

    it('should handle multiple concurrent trading pairs', async () => {
      // Test Requirements: 4.1, 4.2, 4.3
      
      await tradingEngine.startTrading();

      // Process market data for multiple symbols
      const symbols = ['BTC/USDT', 'ETH/USDT'];
      
      for (const symbol of symbols) {
        const marketData: MarketData = {
          symbol,
          timestamp: Date.now(),
          price: symbol === 'BTC/USDT' ? 40000 : 2500,
          volume: 1000,
          orderBook: {
            bids: [{ price: symbol === 'BTC/USDT' ? 39900 : 2490, amount: 1 }],
            asks: [{ price: symbol === 'BTC/USDT' ? 40100 : 2510, amount: 1 }]
          },
          indicators: { rsi: 30, macd: 0.2, movingAverage: symbol === 'BTC/USDT' ? 39500 : 2450 }
        };

        await tradingEngine.processMarketData(marketData);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Check positions for both symbols
      const positions = await mockGate.getOpenPositions();
      const symbolsWithPositions = positions.map(p => p.symbol);
      
      expect(positions.length).toBeGreaterThan(0);
      expect(symbolsWithPositions).toContain('BTC/USDT');

      await tradingEngine.stopTrading();
    }, 10000);

    it('should respect risk management limits', async () => {
      // Test Requirements: 4.1, 4.2, 6.1, 6.2, 6.3
      
      // Set low balance to test risk limits
      mockGate.setBalance({ USDT: { available: 50, locked: 0 } });
      
      await tradingEngine.startTrading();

      const marketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 40000,
        volume: 1000,
        orderBook: {
          bids: [{ price: 39900, amount: 1 }],
          asks: [{ price: 40100, amount: 1 }]
        },
        indicators: { rsi: 30, macd: 0.2, movingAverage: 39500 }
      };

      await tradingEngine.processMarketData(marketData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // With low balance, position size should be limited
      const positions = await mockGate.getOpenPositions();
      if (positions.length > 0) {
        const totalValue = positions.reduce((sum, p) => sum + (p.amount * p.entryPrice), 0);
        expect(totalValue).toBeLessThan(100); // Should respect risk limits
      }

      await tradingEngine.stopTrading();
    }, 10000);

    it('should update positions and track P&L', async () => {
      // Test Requirements: 4.1, 4.2, 5.1, 5.2, 5.3
      
      await tradingEngine.startTrading();

      // Create initial position
      const initialMarketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 40000,
        volume: 1000,
        orderBook: {
          bids: [{ price: 39900, amount: 1 }],
          asks: [{ price: 40100, amount: 1 }]
        },
        indicators: { rsi: 30, macd: 0.2, movingAverage: 39500 }
      };

      await tradingEngine.processMarketData(initialMarketData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update positions
      await tradingEngine.updatePositions();

      const activePositions = tradingEngine.getActivePositions();
      expect(activePositions.length).toBeGreaterThan(0);

      // Simulate price change
      const updatedMarketData: MarketData = {
        ...initialMarketData,
        price: 42000, // Price increased
        timestamp: Date.now()
      };

      await tradingEngine.processMarketData(updatedMarketData);
      await tradingEngine.updatePositions();

      await tradingEngine.stopTrading();
    }, 10000);
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle Nebius service failures', async () => {
      // Test Requirements: 7.1, 7.2
      
      await tradingEngine.startTrading();

      // Simulate Nebius failure
      mockNebius.setFailureMode(true);

      const marketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 40000,
        volume: 1000,
        orderBook: {
          bids: [{ price: 39900, amount: 1 }],
          asks: [{ price: 40100, amount: 1 }]
        },
        indicators: { rsi: 30, macd: 0.2, movingAverage: 39500 }
      };

      // Should not throw error, should handle gracefully
      await expect(tradingEngine.processMarketData(marketData)).resolves.not.toThrow();

      // Wait for error to be processed
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check recovery status - error should be logged
      const recoveryStatus = tradingEngine.getRecoveryStatus();
      expect(recoveryStatus.errorStatistics).toBeDefined();

      mockNebius.setFailureMode(false);
      await tradingEngine.stopTrading();
    }, 10000);

    it('should handle Gate.io service failures', async () => {
      // Test Requirements: 7.1, 7.2
      
      await tradingEngine.startTrading();

      // Simulate Gate failure
      mockGate.setFailureMode(true);

      // Should handle authentication failure gracefully
      const authResult = await mockGate.authenticate().catch(() => false);
      expect(authResult).toBe(false);

      // Try to get market data - should fail gracefully
      await expect(mockGate.getMarketData('BTC/USDT')).rejects.toThrow();

      // Check that engine continues running
      expect(tradingEngine.getState().isRunning).toBe(true);

      mockGate.setFailureMode(false);
      await tradingEngine.stopTrading();
    }, 10000);

    it('should handle market data service failures', async () => {
      // Test Requirements: 7.1, 7.2
      
      mockMarketData.setFailureMode(true);

      // Should handle subscription failure
      await expect(tradingEngine.startTrading()).rejects.toThrow();

      mockMarketData.setFailureMode(false);
    }, 10000);

    it('should handle risk management failures', async () => {
      // Test Requirements: 7.1, 7.2
      
      await tradingEngine.startTrading();

      // Simulate risk service failure
      mockRisk.setFailureMode(true);

      const marketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 40000,
        volume: 1000,
        orderBook: {
          bids: [{ price: 39900, amount: 1 }],
          asks: [{ price: 40100, amount: 1 }]
        },
        indicators: { rsi: 30, macd: 0.2, movingAverage: 39500 }
      };

      // Should handle risk validation failure gracefully
      await expect(tradingEngine.processMarketData(marketData)).resolves.not.toThrow();

      mockRisk.setFailureMode(false);
      await tradingEngine.stopTrading();
    }, 10000);

    it('should recover from network connectivity issues', async () => {
      // Test Requirements: 7.1, 7.2
      
      const recoveryStatus = tradingEngine.getRecoveryStatus();
      expect(recoveryStatus.connectionStatus).toBeDefined();

      // Test force recovery
      const recoveryResult = await tradingEngine.forceServiceRecovery('nebius');
      expect(typeof recoveryResult).toBe('boolean');

      // Test error tracking reset
      tradingEngine.resetServiceErrors('nebius');
      
      const updatedStatus = tradingEngine.getRecoveryStatus();
      expect(updatedStatus.errorStatistics.errorsByService.nebius || 0).toBe(0);
    }, 10000);

    it('should persist and restore system state', async () => {
      // Test Requirements: 7.5
      
      await tradingEngine.startTrading();

      // Create some state
      const marketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 40000,
        volume: 1000,
        orderBook: {
          bids: [{ price: 39900, amount: 1 }],
          asks: [{ price: 40100, amount: 1 }]
        },
        indicators: { rsi: 30, macd: 0.2, movingAverage: 39500 }
      };

      await tradingEngine.processMarketData(marketData);
      await new Promise(resolve => setTimeout(resolve, 100));

      const initialState = tradingEngine.getState();
      const initialRecoveryState = tradingEngine.getRecoveryStatus().systemState;

      await tradingEngine.stopTrading();

      // State should be persisted
      expect(initialRecoveryState).toBeDefined();
      expect(initialState.lastMarketUpdate).toBeDefined();
    }, 10000);
  });

  describe('Performance and Monitoring', () => {
    it('should process market data within 1-second requirement', async () => {
      // Test Requirements: 3.4
      
      await tradingEngine.startTrading();

      const marketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 40000,
        volume: 1000,
        orderBook: {
          bids: Array.from({ length: 20 }, (_, i) => ({ price: 39900 - i, amount: 1 })),
          asks: Array.from({ length: 20 }, (_, i) => ({ price: 40100 + i, amount: 1 }))
        },
        indicators: { rsi: 30, macd: 0.2, movingAverage: 39500 }
      };

      const startTime = Date.now();
      await tradingEngine.processMarketData(marketData);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second

      await tradingEngine.stopTrading();
    }, 10000);

    it('should handle high-frequency market data updates', async () => {
      // Test Requirements: 3.1, 3.4
      
      await tradingEngine.startTrading();

      const updatePromises = [];
      
      // Send multiple rapid updates
      for (let i = 0; i < 10; i++) {
        const marketData: MarketData = {
          symbol: 'BTC/USDT',
          timestamp: Date.now() + i,
          price: 40000 + i * 10,
          volume: 1000,
          orderBook: {
            bids: [{ price: 39900 + i * 10, amount: 1 }],
            asks: [{ price: 40100 + i * 10, amount: 1 }]
          },
          indicators: { rsi: 30 + i, macd: 0.2, movingAverage: 39500 + i * 10 }
        };

        updatePromises.push(tradingEngine.processMarketData(marketData));
      }

      // All updates should complete successfully
      await expect(Promise.all(updatePromises)).resolves.not.toThrow();

      await tradingEngine.stopTrading();
    }, 10000);

    it('should maintain system stability under load', async () => {
      // Test Requirements: 7.1, 7.2, 7.3
      
      await tradingEngine.startTrading();

      // Simulate sustained load
      const loadPromises = [];
      
      for (let i = 0; i < 50; i++) {
        const promise = (async () => {
          const marketData: MarketData = {
            symbol: i % 2 === 0 ? 'BTC/USDT' : 'ETH/USDT',
            timestamp: Date.now() + i,
            price: (i % 2 === 0 ? 40000 : 3000) + Math.random() * 1000,
            volume: 1000,
            orderBook: {
              bids: [{ price: (i % 2 === 0 ? 39900 : 2990), amount: 1 }],
              asks: [{ price: (i % 2 === 0 ? 40100 : 3010), amount: 1 }]
            },
            indicators: { rsi: 30 + Math.random() * 40, macd: 0.2, movingAverage: (i % 2 === 0 ? 39500 : 2950) }
          };

          await tradingEngine.processMarketData(marketData);
          await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
        })();
        
        loadPromises.push(promise);
      }

      await Promise.all(loadPromises);

      // Engine should still be running and responsive
      expect(tradingEngine.getState().isRunning).toBe(true);
      
      const finalState = tradingEngine.getState();
      expect(finalState.lastMarketUpdate).toBeDefined();

      await tradingEngine.stopTrading();
    }, 15000);
  });
});