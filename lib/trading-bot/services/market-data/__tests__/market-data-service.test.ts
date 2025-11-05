import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MarketDataService } from '../market-data-service';
import { MarketData, GateExchangeService, TechnicalIndicators } from '../../../types';
import { DefaultErrorHandler } from '../../base';

// Mock the Gate.io service
const mockGateService: GateExchangeService = {
  authenticate: vi.fn(),
  getMarketData: vi.fn(),
  getAccountBalance: vi.fn(),
  placeBuyOrder: vi.fn(),
  placeSellOrder: vi.fn(),
  getOpenPositions: vi.fn(),
  cancelOrder: vi.fn()
};

describe('MarketDataService', () => {
  let service: MarketDataService;
  let errorHandler: DefaultErrorHandler;
  let config: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      updateInterval: 1000,
      maxHistoryLength: 100,
      enableRealTimeUpdates: true,
      tradingPairs: ['BTC/USDT', 'ETH/USDT'],
      technicalIndicatorsPeriods: {
        rsi: 14,
        macd: {
          fast: 12,
          slow: 26,
          signal: 9
        },
        movingAverage: 20
      }
    };

    errorHandler = new DefaultErrorHandler();
    service = new MarketDataService(config, mockGateService, errorHandler);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Configuration and Initialization', () => {
    it('should create service instance with valid config', () => {
      expect(service).toBeDefined();
    });

    it('should throw error with missing update interval', () => {
      const invalidConfig = { ...config, updateInterval: undefined };
      expect(() => new MarketDataService(invalidConfig, mockGateService, errorHandler))
        .toThrow('Update interval is required');
    });

    it('should throw error with too short update interval', () => {
      const invalidConfig = { ...config, updateInterval: 500 };
      expect(() => new MarketDataService(invalidConfig, mockGateService, errorHandler))
        .toThrow('Update interval must be at least 1000ms to meet 1-second requirement');
    });

    it('should throw error with missing trading pairs', () => {
      const invalidConfig = { ...config, tradingPairs: undefined };
      expect(() => new MarketDataService(invalidConfig, mockGateService, errorHandler))
        .toThrow('Trading pairs is required');
    });

    it('should throw error with empty trading pairs array', () => {
      const invalidConfig = { ...config, tradingPairs: [] };
      expect(() => new MarketDataService(invalidConfig, mockGateService, errorHandler))
        .toThrow('At least one trading pair must be configured');
    });
  });

  describe('Market Data Subscription', () => {
    const mockMarketData: MarketData = {
      symbol: 'BTC/USDT',
      timestamp: Date.now(),
      price: 50000,
      volume: 1000,
      orderBook: {
        bids: [{ price: 49999, amount: 1.0 }, { price: 49998, amount: 2.0 }],
        asks: [{ price: 50001, amount: 1.5 }, { price: 50002, amount: 2.5 }]
      },
      indicators: {
        rsi: 55,
        macd: 0.5,
        movingAverage: 49500
      }
    };

    beforeEach(() => {
      vi.mocked(mockGateService.getMarketData).mockResolvedValue(mockMarketData);
    });

    it('should subscribe to market data successfully', async () => {
      await service.subscribeToMarket('BTC/USDT');
      
      expect(service.getSubscribedSymbols()).toContain('BTC/USDT');
      expect(mockGateService.getMarketData).toHaveBeenCalledWith('BTC/USDT');
    });

    it('should not subscribe to same symbol twice', async () => {
      await service.subscribeToMarket('BTC/USDT');
      await service.subscribeToMarket('BTC/USDT');
      
      expect(mockGateService.getMarketData).toHaveBeenCalledTimes(1);
    });

    it('should handle subscription errors gracefully', async () => {
      vi.mocked(mockGateService.getMarketData).mockRejectedValue(new Error('API Error'));
      
      await expect(service.subscribeToMarket('INVALID/PAIR')).rejects.toThrow();
    });

    it('should unsubscribe from market data', async () => {
      await service.subscribeToMarket('BTC/USDT');
      expect(service.getSubscribedSymbols()).toContain('BTC/USDT');
      
      await service.unsubscribeFromMarket('BTC/USDT');
      expect(service.getSubscribedSymbols()).not.toContain('BTC/USDT');
    });

    it('should handle unsubscribe from non-subscribed symbol', async () => {
      await service.unsubscribeFromMarket('NON/EXISTENT');
      // Should not throw error
      expect(service.getSubscribedSymbols()).not.toContain('NON/EXISTENT');
    });
  });

  describe('Tick Data Processing', () => {
    it('should process valid tick data successfully', async () => {
      const tickData = {
        symbol: 'BTC/USDT',
        price: 50000,
        volume: 100,
        timestamp: Date.now(),
        orderBook: {
          bids: [{ price: 49999, amount: 1.0 }],
          asks: [{ price: 50001, amount: 1.0 }]
        }
      };

      await expect(service.processTickData(tickData)).resolves.not.toThrow();
    });

    it('should reject tick data without symbol', async () => {
      const invalidTick = {
        price: 50000,
        volume: 100,
        timestamp: Date.now()
      };

      await expect(service.processTickData(invalidTick)).rejects.toThrow('Invalid tick data: missing symbol');
    });

    it('should reject tick data with invalid price', async () => {
      const invalidTick = {
        symbol: 'BTC/USDT',
        price: -100,
        volume: 100,
        timestamp: Date.now()
      };

      await expect(service.processTickData(invalidTick)).rejects.toThrow();
    });

    it('should reject tick data with invalid volume', async () => {
      const invalidTick = {
        symbol: 'BTC/USDT',
        price: 50000,
        volume: -100,
        timestamp: Date.now()
      };

      await expect(service.processTickData(invalidTick)).rejects.toThrow();
    });

    it('should process tick data within 1-second requirement', async () => {
      const tickData = {
        symbol: 'BTC/USDT',
        price: 50000,
        volume: 100,
        timestamp: Date.now()
      };

      const startTime = Date.now();
      await service.processTickData(tickData);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(1000);
    });
  });

  describe('Data Validation', () => {
    it('should validate correct market data', () => {
      const validData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        volume: 1000,
        orderBook: {
          bids: [{ price: 49999, amount: 1.0 }],
          asks: [{ price: 50001, amount: 1.0 }]
        },
        indicators: {
          rsi: 55,
          macd: 0.5,
          movingAverage: 49500
        }
      };

      expect(service.validateDataIntegrity(validData)).toBe(true);
    });

    it('should reject data with invalid symbol', () => {
      const invalidData: MarketData = {
        symbol: '',
        timestamp: Date.now(),
        price: 50000,
        volume: 1000,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 55, macd: 0.5, movingAverage: 49500 }
      };

      expect(service.validateDataIntegrity(invalidData)).toBe(false);
    });

    it('should reject data with invalid timestamp', () => {
      const invalidData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: 0,
        price: 50000,
        volume: 1000,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 55, macd: 0.5, movingAverage: 49500 }
      };

      expect(service.validateDataIntegrity(invalidData)).toBe(false);
    });

    it('should reject data with invalid price', () => {
      const invalidData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: -100,
        volume: 1000,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 55, macd: 0.5, movingAverage: 49500 }
      };

      expect(service.validateDataIntegrity(invalidData)).toBe(false);
    });

    it('should reject data with invalid volume', () => {
      const invalidData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        volume: -100,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 55, macd: 0.5, movingAverage: 49500 }
      };

      expect(service.validateDataIntegrity(invalidData)).toBe(false);
    });

    it('should validate order book structure', () => {
      const validOrderBook = {
        bids: [
          { price: 49999, amount: 1.0 },
          { price: 49998, amount: 2.0 }
        ],
        asks: [
          { price: 50001, amount: 1.5 },
          { price: 50002, amount: 2.5 }
        ]
      };

      const validData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        volume: 1000,
        orderBook: validOrderBook,
        indicators: { rsi: 55, macd: 0.5, movingAverage: 49500 }
      };

      expect(service.validateDataIntegrity(validData)).toBe(true);
    });

    it('should reject invalid order book with negative prices', () => {
      const invalidOrderBook = {
        bids: [{ price: -100, amount: 1.0 }],
        asks: [{ price: 50001, amount: 1.5 }]
      };

      const invalidData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        volume: 1000,
        orderBook: invalidOrderBook,
        indicators: { rsi: 55, macd: 0.5, movingAverage: 49500 }
      };

      expect(service.validateDataIntegrity(invalidData)).toBe(false);
    });

    it('should validate technical indicators', () => {
      const validIndicators: TechnicalIndicators = {
        rsi: 55,
        macd: 0.5,
        movingAverage: 49500
      };

      const validData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        volume: 1000,
        orderBook: { bids: [], asks: [] },
        indicators: validIndicators
      };

      expect(service.validateDataIntegrity(validData)).toBe(true);
    });

    it('should reject invalid RSI values', () => {
      const invalidIndicators: TechnicalIndicators = {
        rsi: 150, // RSI should be 0-100
        macd: 0.5,
        movingAverage: 49500
      };

      const invalidData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        volume: 1000,
        orderBook: { bids: [], asks: [] },
        indicators: invalidIndicators
      };

      expect(service.validateDataIntegrity(invalidData)).toBe(false);
    });
  });

  describe('Technical Indicators Calculation', () => {
    it('should calculate RSI correctly', () => {
      // Test with known price sequence
      const prices = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89, 46.03, 46.83, 46.69, 46.45, 46.59, 46.3, 46.28, 46.28, 46];
      const indicators = service.calculateIndicators(prices);
      
      expect(indicators.rsi).toBeGreaterThan(0);
      expect(indicators.rsi).toBeLessThan(100);
      expect(typeof indicators.rsi).toBe('number');
    });

    it('should calculate MACD correctly', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 50000 + Math.sin(i / 5) * 1000);
      const indicators = service.calculateIndicators(prices);
      
      expect(typeof indicators.macd).toBe('number');
      expect(indicators.macd).not.toBeNaN();
    });

    it('should calculate moving average correctly', () => {
      const prices = [50000, 51000, 49000, 52000, 48000];
      const indicators = service.calculateIndicators(prices);
      
      const expectedMA = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      expect(indicators.movingAverage).toBe(expectedMA);
    });

    it('should handle insufficient data for indicators', () => {
      const prices = [50000]; // Only one price point
      const indicators = service.calculateIndicators(prices);
      
      expect(indicators.rsi).toBe(50); // Default neutral RSI
      expect(indicators.macd).toBe(0); // Default MACD
      expect(indicators.movingAverage).toBe(50000); // Should return the single price
    });

    it('should handle empty price array', () => {
      const prices: number[] = [];
      const indicators = service.calculateIndicators(prices);
      
      expect(indicators.rsi).toBe(50);
      expect(indicators.macd).toBe(0);
      expect(indicators.movingAverage).toBe(0);
    });
  });

  describe('Real-time Collection Management', () => {
    beforeEach(() => {
      vi.mocked(mockGateService.getMarketData).mockResolvedValue({
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        volume: 1000,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 55, macd: 0.5, movingAverage: 49500 }
      });
    });

    it('should start real-time collection for all configured pairs', async () => {
      await service.startRealTimeCollection();
      
      expect(service.getSubscribedSymbols()).toEqual(expect.arrayContaining(['BTC/USDT', 'ETH/USDT']));
    });

    it('should not start collection if already running', async () => {
      await service.startRealTimeCollection();
      const firstCallCount = vi.mocked(mockGateService.getMarketData).mock.calls.length;
      
      await service.startRealTimeCollection();
      const secondCallCount = vi.mocked(mockGateService.getMarketData).mock.calls.length;
      
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should stop real-time collection', async () => {
      await service.startRealTimeCollection();
      expect(service.getSubscribedSymbols().length).toBeGreaterThan(0);
      
      await service.stopRealTimeCollection();
      expect(service.getSubscribedSymbols().length).toBe(0);
    });

    it('should handle stop when not running', async () => {
      await expect(service.stopRealTimeCollection()).resolves.not.toThrow();
    });
  });

  describe('Event Handling', () => {
    it('should emit market data update events', async () => {
      const mockCallback = vi.fn();
      service.onMarketDataUpdate(mockCallback);

      const tickData = {
        symbol: 'BTC/USDT',
        price: 50000,
        volume: 100,
        timestamp: Date.now()
      };

      await service.processTickData(tickData);
      
      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        symbol: 'BTC/USDT',
        price: 50000,
        volume: 100
      }));
    });

    it('should remove event listeners', async () => {
      const mockCallback = vi.fn();
      service.onMarketDataUpdate(mockCallback);
      service.removeMarketDataListener(mockCallback);

      const tickData = {
        symbol: 'BTC/USDT',
        price: 50000,
        volume: 100,
        timestamp: Date.now()
      };

      await service.processTickData(tickData);
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Data Retrieval', () => {
    beforeEach(async () => {
      const mockMarketData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 50000,
        volume: 1000,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 55, macd: 0.5, movingAverage: 49500 }
      };

      vi.mocked(mockGateService.getMarketData).mockResolvedValue(mockMarketData);
      await service.subscribeToMarket('BTC/USDT');
    });

    it('should get current market data for subscribed symbol', () => {
      const data = service.getMarketData('BTC/USDT');
      expect(data).toBeDefined();
      expect(data?.symbol).toBe('BTC/USDT');
    });

    it('should return null for non-subscribed symbol', () => {
      const data = service.getMarketData('ETH/USDT');
      expect(data).toBeNull();
    });

    it('should get price history for symbol', () => {
      const history = service.getPriceHistory('BTC/USDT');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return empty array for non-existent symbol history', () => {
      const history = service.getPriceHistory('NON/EXISTENT');
      expect(history).toEqual([]);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(mockGateService.getMarketData).mockRejectedValue(new Error('Network error'));
      
      await expect(service.subscribeToMarket('BTC/USDT')).rejects.toThrow();
    });

    it('should continue processing after individual tick errors', async () => {
      const validTick = {
        symbol: 'BTC/USDT',
        price: 50000,
        volume: 100,
        timestamp: Date.now()
      };

      const invalidTick = {
        symbol: 'BTC/USDT',
        price: -100, // Invalid price
        volume: 100,
        timestamp: Date.now()
      };

      // First tick should fail
      await expect(service.processTickData(invalidTick)).rejects.toThrow();
      
      // Second tick should succeed
      await expect(service.processTickData(validTick)).resolves.not.toThrow();
    });

    it('should validate extreme price values', () => {
      const extremeData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now(),
        price: 10000000, // Very high price
        volume: 1000,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 55, macd: 0.5, movingAverage: 49500 }
      };

      // Should still validate but may log warning
      expect(service.validateDataIntegrity(extremeData)).toBe(true);
    });

    it('should handle old timestamp data', () => {
      const oldData: MarketData = {
        symbol: 'BTC/USDT',
        timestamp: Date.now() - 600000, // 10 minutes old
        price: 50000,
        volume: 1000,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 55, macd: 0.5, movingAverage: 49500 }
      };

      // Should still validate but may log warning
      expect(service.validateDataIntegrity(oldData)).toBe(true);
    });
  });
});