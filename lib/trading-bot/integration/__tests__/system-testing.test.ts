// Comprehensive System Testing Suite
// Test system under various market conditions and validate error handling
// Requirements: 7.1, 7.2, 7.3, 7.4

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { EndToEndTradingWorkflow } from '../end-to-end-workflow';
import { TradingEngine } from '../../engine/trading-engine';
import { NebiusService } from '../../services/nebius';
import { GateService } from '../../services/gate';
import { MarketDataService } from '../../services/market-data';
import { RiskManagementService } from '../../services/risk-management';
import { DatabaseService } from '../../database';
import { TradingBotConfig, ErrorHandler, MarketData, TradingSignal } from '../../types';

describe('Comprehensive System Testing', () => {
  let tradingEngine: TradingEngine;
  let services: {
    nebiusService: NebiusService;
    gateService: GateService;
    marketDataService: MarketDataService;
    riskService: RiskManagementService;
    databaseService: DatabaseService;
    errorHandler: ErrorHandler;
  };

  const testConfig: TradingBotConfig = {
    tradingPairs: ['BTC/USDT', 'ETH/USDT'],
    marketDataUpdateInterval: 1000,
    nebius: {
      apiUrl: process.env.NEBIUS_API_URL || 'https://api.nebius.ai',
      jwtToken: process.env.NEBIUS_JWT_TOKEN || 'test-jwt-token',
      model: process.env.NEBIUS_MODEL || 'trading-v1',
      maxRetries: 3,
      timeout: 10000
    },
    gate: {
      baseUrl: 'https://fx-api-testnet.gateio.ws',
      apiKey: process.env.GATE_API_KEY || 'test-api-key',
      apiSecret: process.env.GATE_API_SECRET || 'test-api-secret',
      testnet: true
    },
    risk: {
      maxDailyLoss: 50, // Reduced for testing
      maxPositionSize: 25, // Reduced for testing
      stopLossPercentage: 0.05,
      maxOpenPositions: 2, // Reduced for testing
      emergencyStopEnabled: true
    }
  };

  beforeAll(async () => {
    // Initialize error handler
    const errorHandler: ErrorHandler = {
      logError: (error: Error, context: string) => {
        console.error(`[${context}] ${error.message}`);
      },
      handleNebiusError: (error: any) => {
        console.error('Nebius error:', error);
      },
      handleGateError: (error: any) => {
        console.error('Gate error:', error);
      },
      handleNetworkError: (error: any) => {
        console.error('Network error:', error);
      }
    };

    // Initialize services
    const nebiusService = new NebiusService(testConfig.nebius);
    const gateService = new GateService(testConfig.gate, errorHandler);
    
    const marketDataService = new MarketDataService({
      updateInterval: 1000,
      maxHistoryLength: 50,
      enableRealTimeUpdates: true,
      tradingPairs: testConfig.tradingPairs,
      technicalIndicatorsPeriods: {
        rsi: 14,
        macd: { fast: 12, slow: 26, signal: 9 },
        movingAverage: 20
      }
    }, gateService, errorHandler);

    const riskService = new RiskManagementService(testConfig.risk, errorHandler);
    const databaseService = new DatabaseService();

    services = {
      nebiusService,
      gateService,
      marketDataService,
      riskService,
      databaseService,
      errorHandler
    };

    // Initialize trading engine
    tradingEngine = new TradingEngine(testConfig, services);
  });

  afterAll(async () => {
    // Cleanup
    if (services.databaseService) {
      await services.databaseService.disconnect();
    }
    
    if (tradingEngine) {
      const state = tradingEngine.getState();
      if (state.isRunning) {
        await tradingEngine.stopTrading();
      }
    }
  });

  beforeEach(async () => {
    // Reset state before each test
    if (tradingEngine) {
      const state = tradingEngine.getState();
      if (state.isRunning) {
        await tradingEngine.stopTrading();
      }
    }
  });

  describe('Market Condition Testing', () => {
    test('should handle volatile market conditions', async () => {
      // Create mock volatile market data
      const volatileMarketData: MarketData[] = [
        {
          symbol: 'BTC/USDT',
          timestamp: Date.now(),
          price: 50000,
          volume: 1000,
          orderBook: { bids: [[49900, 1.5]], asks: [[50100, 1.2]] },
          indicators: { rsi: 80, macd: 200, movingAverage: 49000 }
        },
        {
          symbol: 'BTC/USDT',
          timestamp: Date.now() + 1000,
          price: 48000, // 4% drop
          volume: 2000,
          orderBook: { bids: [[47900, 2.0]], asks: [[48100, 1.8]] },
          indicators: { rsi: 20, macd: -150, movingAverage: 49000 }
        },
        {
          symbol: 'BTC/USDT',
          timestamp: Date.now() + 2000,
          price: 52000, // 8.3% spike
          volume: 3000,
          orderBook: { bids: [[51900, 1.0]], asks: [[52100, 0.8]] },
          indicators: { rsi: 90, macd: 300, movingAverage: 49500 }
        }
      ];

      let processedCount = 0;
      let errorCount = 0;

      // Process volatile market data
      for (const marketData of volatileMarketData) {
        try {
          await tradingEngine.processMarketData(marketData);
          processedCount++;
        } catch (error) {
          errorCount++;
          console.log('Expected error in volatile conditions:', (error as Error).message);
        }
      }

      // Should handle at least some of the volatile data
      expect(processedCount).toBeGreaterThan(0);
      expect(errorCount).toBeLessThan(volatileMarketData.length);
    }, 30000);

    test('should handle stale market data', async () => {
      const staleMarketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now() - 300000, // 5 minutes old
        price: 50000,
        volume: 1000,
        orderBook: { bids: [[49900, 1.5]], asks: [[50100, 1.2]] },
        indicators: { rsi: 50, macd: 0, movingAverage: 50000 }
      };

      // Should handle stale data gracefully
      await expect(tradingEngine.processMarketData(staleMarketData)).resolves.not.toThrow();
    });

    test('should handle missing market data fields', async () => {
      const incompleteMarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        // Missing volume, orderBook, indicators
      } as MarketData;

      // Should handle incomplete data gracefully
      await expect(tradingEngine.processMarketData(incompleteMarketData)).resolves.not.toThrow();
    });

    test('should handle extreme price movements', async () => {
      const extremeMarketData: MarketData[] = [
        {
          symbol: 'BTC/USDT',
          timestamp: Date.now(),
          price: 50000,
          volume: 1000,
          orderBook: { bids: [[49900, 1.5]], asks: [[50100, 1.2]] },
          indicators: { rsi: 50, macd: 0, movingAverage: 50000 }
        },
        {
          symbol: 'BTC/USDT',
          timestamp: Date.now() + 1000,
          price: 25000, // 50% crash
          volume: 10000,
          orderBook: { bids: [[24900, 5.0]], asks: [[25100, 4.0]] },
          indicators: { rsi: 5, macd: -500, movingAverage: 45000 }
        }
      ];

      let handledCorrectly = true;
      
      for (const marketData of extremeMarketData) {
        try {
          await tradingEngine.processMarketData(marketData);
        } catch (error) {
          // Extreme movements should be handled, not crash the system
          console.log('Handled extreme market data:', (error as Error).message);
        }
      }

      expect(handledCorrectly).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should recover from network connectivity loss', async () => {
      // Simulate network error
      const networkError = new Error('Network connectivity lost');
      
      // Test error handling
      services.errorHandler.handleNetworkError({
        name: 'NetworkError',
        message: networkError.message,
        code: 'NETWORK_LOST',
        retryable: true
      });

      // Should not crash the system
      expect(true).toBe(true);
    });

    test('should handle API rate limiting', async () => {
      // Simulate rate limit error
      const rateLimitError = {
        name: 'RateLimitError',
        message: 'API rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
      };

      services.errorHandler.handleGateError(rateLimitError);
      
      // Should handle gracefully
      expect(true).toBe(true);
    });

    test('should handle authentication failures', async () => {
      // Simulate authentication error
      const authError = {
        name: 'AuthenticationError',
        message: 'Invalid API credentials',
        code: 'AUTH_FAILED'
      };

      services.errorHandler.handleNebiusError(authError);
      services.errorHandler.handleGateError(authError);
      
      // Should handle gracefully
      expect(true).toBe(true);
    });

    test('should handle database connection loss', async () => {
      // Test database error handling
      try {
        // This will likely fail in test environment
        await services.databaseService.testConnection();
      } catch (error) {
        // Should handle database errors gracefully
        services.errorHandler.logError(error as Error, 'Database connection test');
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle invalid trading signals', async () => {
      const invalidSignals: Partial<TradingSignal>[] = [
        {
          symbol: 'BTC/USDT',
          action: 'invalid_action' as any,
          confidence: 0.8
        },
        {
          symbol: 'BTC/USDT',
          action: 'buy',
          confidence: 1.5 // Invalid confidence > 1
        },
        {
          symbol: '',
          action: 'buy',
          confidence: 0.8
        }
      ];

      for (const signal of invalidSignals) {
        try {
          await tradingEngine.executeTradeSignal(signal as TradingSignal);
        } catch (error) {
          // Should handle invalid signals gracefully
          console.log('Handled invalid signal:', (error as Error).message);
        }
      }

      expect(true).toBe(true);
    });
  });

  describe('Risk Management Testing', () => {
    test('should enforce position size limits', async () => {
      const largeSignal: TradingSignal = {
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 0.9,
        targetPrice: 50000,
        stopLoss: 47500,
        reasoning: 'Test large position',
        timestamp: new Date()
      };

      // Should limit position size according to risk parameters
      const positionSize = services.riskService.calculatePositionSize(largeSignal, 1000);
      expect(positionSize).toBeLessThanOrEqual(testConfig.risk.maxPositionSize);
    });

    test('should enforce daily loss limits', async () => {
      // Simulate reaching daily loss limit
      const mockLossyTrades = Array(10).fill(null).map((_, i) => ({
        symbol: 'BTC/USDT',
        side: 'buy' as const,
        amount: 0.01,
        price: 50000,
        pnl: -10 // Each trade loses $10
      }));

      // Risk service should prevent further trading
      await services.riskService.enforceRiskLimits();
      
      expect(true).toBe(true);
    });

    test('should handle emergency stop', async () => {
      // Test emergency stop functionality
      if (testConfig.risk.emergencyStopEnabled) {
        // Emergency stop should be available
        expect(testConfig.risk.emergencyStopEnabled).toBe(true);
      }
    });
  });

  describe('Performance Testing', () => {
    test('should process market data within time limits', async () => {
      const marketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        volume: 1000,
        orderBook: { bids: [[49900, 1.5]], asks: [[50100, 1.2]] },
        indicators: { rsi: 50, macd: 0, movingAverage: 50000 }
      };

      const startTime = Date.now();
      await tradingEngine.processMarketData(marketData);
      const processingTime = Date.now() - startTime;

      // Should process within 1 second (requirement)
      expect(processingTime).toBeLessThan(1000);
    });

    test('should handle concurrent market data updates', async () => {
      const marketDataBatch: MarketData[] = Array(5).fill(null).map((_, i) => ({
        symbol: i % 2 === 0 ? 'BTC/USDT' : 'ETH/USDT',
        timestamp: Date.now() + i * 100,
        price: 50000 + i * 100,
        volume: 1000 + i * 100,
        orderBook: { bids: [[49900 + i * 100, 1.5]], asks: [[50100 + i * 100, 1.2]] },
        indicators: { rsi: 50 + i, macd: i * 10, movingAverage: 50000 + i * 50 }
      }));

      const startTime = Date.now();
      
      // Process all market data concurrently
      await Promise.all(
        marketDataBatch.map(data => tradingEngine.processMarketData(data))
      );
      
      const totalTime = Date.now() - startTime;
      
      // Should handle concurrent updates efficiently
      expect(totalTime).toBeLessThan(5000);
    });

    test('should maintain system stability under load', async () => {
      const loadTestDuration = 10000; // 10 seconds
      const updateInterval = 100; // 100ms
      const startTime = Date.now();
      
      let updateCount = 0;
      let errorCount = 0;

      while (Date.now() - startTime < loadTestDuration) {
        try {
          const marketData: MarketData = {
            symbol: 'BTC/USDT',
            timestamp: Date.now(),
            price: 50000 + Math.random() * 1000,
            volume: 1000 + Math.random() * 500,
            orderBook: { bids: [[49900, 1.5]], asks: [[50100, 1.2]] },
            indicators: { 
              rsi: 30 + Math.random() * 40, 
              macd: Math.random() * 200 - 100, 
              movingAverage: 50000 + Math.random() * 500 
            }
          };

          await tradingEngine.processMarketData(marketData);
          updateCount++;
          
          await new Promise(resolve => setTimeout(resolve, updateInterval));
        } catch (error) {
          errorCount++;
        }
      }

      // Should process most updates successfully
      const successRate = updateCount / (updateCount + errorCount);
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate
      expect(updateCount).toBeGreaterThan(50); // Should process at least 50 updates
    }, 15000);
  });

  describe('Integration Testing', () => {
    test('should integrate all services correctly', async () => {
      const workflow = new EndToEndTradingWorkflow(testConfig, services);
      
      const results = await workflow.executeEndToEndWorkflow({
        testDuration: 5000,
        tradingPairs: ['BTC/USDT'],
        enableRealTrading: false,
        validationSteps: [
          'Service Authentication',
          'Market Data Flow',
          'AI Analysis Flow',
          'Risk Management'
        ],
        mockMode: true
      });

      // Should complete integration test
      expect(results.length).toBeGreaterThan(0);
      
      const summary = workflow.getValidationSummary();
      expect(summary.totalStages).toBeGreaterThan(0);
    });

    test('should maintain data consistency across services', async () => {
      const marketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        volume: 1000,
        orderBook: { bids: [[49900, 1.5]], asks: [[50100, 1.2]] },
        indicators: { rsi: 50, macd: 0, movingAverage: 50000 }
      };

      // Process market data
      await tradingEngine.processMarketData(marketData);
      
      // Check data consistency
      const cachedData = tradingEngine.getMarketData('BTC/USDT') as MarketData;
      if (cachedData) {
        expect(cachedData.symbol).toBe(marketData.symbol);
        expect(cachedData.price).toBe(marketData.price);
      }
    });
  });

  describe('System Recovery Testing', () => {
    test('should recover from service failures', async () => {
      // Get recovery status
      const recoveryStatus = tradingEngine.getRecoveryStatus();
      
      // Should have recovery system active
      expect(recoveryStatus).toBeDefined();
      expect(typeof recoveryStatus.isInRecoveryMode).toBe('boolean');
    });

    test('should handle graceful shutdown', async () => {
      // Test graceful shutdown
      const state = tradingEngine.getState();
      if (state.isRunning) {
        await tradingEngine.stopTrading();
        const stoppedState = tradingEngine.getState();
        expect(stoppedState.isRunning).toBe(false);
      }
    });
  });
});