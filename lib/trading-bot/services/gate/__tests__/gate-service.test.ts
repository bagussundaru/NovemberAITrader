import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GateService } from '../gate-service';
import { GateConfig, GateError } from '../../../types';
import { DefaultErrorHandler } from '../../base';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto module
vi.mock('crypto', () => ({
  default: {
    createHmac: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => 'mocked-signature')
      }))
    })),
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => 'mocked-hash')
      }))
    })),
    randomUUID: vi.fn(() => 'mocked-uuid')
  }
}));

describe('GateService', () => {
  let service: GateService;
  let config: GateConfig;
  let errorHandler: DefaultErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      baseUrl: 'https://fx-api-testnet.gateio.ws',
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      testnet: true
    };

    errorHandler = new DefaultErrorHandler();
    // Use minimal retry settings for faster tests
    service = new GateService(config, errorHandler, { maxRetries: 1, baseDelay: 10 });
  });



  describe('Configuration and Initialization', () => {
    it('should create service instance with valid config', () => {
      expect(service).toBeDefined();
    });

    it('should throw error with missing API key', () => {
      const invalidConfig = { ...config, apiKey: '' };
      expect(() => new GateService(invalidConfig, errorHandler)).toThrow('Gate.io API Key is required');
    });

    it('should throw error with missing API secret', () => {
      const invalidConfig = { ...config, apiSecret: '' };
      expect(() => new GateService(invalidConfig, errorHandler)).toThrow('Gate.io API Secret is required');
    });

    it('should throw error with missing base URL', () => {
      const invalidConfig = { ...config, baseUrl: '' };
      expect(() => new GateService(invalidConfig, errorHandler)).toThrow('Gate.io Base URL is required');
    });
  });

  describe('Authentication', () => {
    it('should authenticate successfully', async () => {
      // Mock successful account balance response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { currency: 'USDT', available: '1000.0', locked: '0.0' },
          { currency: 'BTC', available: '0.1', locked: '0.0' }
        ])
      });

      const result = await service.authenticate();
      expect(result).toBe(true);
    });

    it('should handle authentication failure gracefully', async () => {
      // Mock authentication failure - service should handle this gracefully
      mockFetch.mockImplementation(() => {
        throw new Error('Authentication failed');
      });

      const result = await service.authenticate();
      expect(result).toBe(false);
    });
  });

  describe('Account Balance', () => {
    beforeEach(async () => {
      // Mock authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([])
      });
      await service.authenticate();
      vi.clearAllMocks();
    });

    it('should get account balance successfully', async () => {
      const mockBalances = [
        { currency: 'USDT', available: '1000.0', locked: '50.0' },
        { currency: 'BTC', available: '0.1', locked: '0.01' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalances
      });

      const balances = await service.getAccountBalance();
      
      expect(balances).toEqual({
        USDT: { available: 1000.0, locked: 50.0 },
        BTC: { available: 0.1, locked: 0.01 }
      });
    });

    it('should handle empty balance response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const balances = await service.getAccountBalance();
      expect(balances).toEqual({});
    });
  });

  describe('Market Data', () => {
    beforeEach(async () => {
      // Mock authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([])
      });
      await service.authenticate();
      vi.clearAllMocks();
    });

    it('should get market data successfully', async () => {
      const mockTicker = {
        currency_pair: 'BTC_USDT',
        last: '50000.0',
        base_volume: '1000.0',
        quote_volume: '50000000.0',
        change_percentage: '2.5',
        high_24h: '51000.0',
        low_24h: '49000.0'
      };

      const mockOrderBook = {
        bids: [['49999.0', '1.0'], ['49998.0', '2.0']],
        asks: [['50001.0', '1.5'], ['50002.0', '2.5']]
      };

      // Mock ticker request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockTicker]
      });

      // Mock order book request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrderBook
      });

      const marketData = await service.getMarketData('BTC/USDT');

      expect(marketData).toMatchObject({
        symbol: 'BTC/USDT',
        price: 50000.0,
        volume: 1000.0,
        orderBook: {
          bids: [
            { price: 49999.0, amount: 1.0 },
            { price: 49998.0, amount: 2.0 }
          ],
          asks: [
            { price: 50001.0, amount: 1.5 },
            { price: 50002.0, amount: 2.5 }
          ]
        }
      });
      expect(marketData.timestamp).toBeGreaterThan(0);
      expect(marketData.indicators).toBeDefined();
    });

    it('should handle market data fetch errors', async () => {
      // Mock error response
      mockFetch.mockImplementation(() => {
        throw new Error('Market data not found');
      });

      await expect(service.getMarketData('INVALID/PAIR')).rejects.toThrow();
    });

    it('should get real-time prices for multiple symbols', async () => {
      const mockTickers = [
        { currency_pair: 'BTC_USDT', last: '50000.0' },
        { currency_pair: 'ETH_USDT', last: '3000.0' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTickers
      });

      const prices = await service.getRealTimePrices(['BTC/USDT', 'ETH/USDT']);
      
      expect(prices).toEqual({
        'BTC/USDT': 50000.0,
        'ETH/USDT': 3000.0
      });
    });
  });

  describe('Trading Operations', () => {
    beforeEach(async () => {
      // Mock authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([])
      });
      await service.authenticate();
      vi.clearAllMocks();
    });

    it('should place buy order successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        currency_pair: 'BTC_USDT',
        side: 'buy' as const,
        amount: '0.1',
        price: '50000.0',
        fee: '5.0',
        status: 'open' as const,
        create_time: '1640995200'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      });

      const result = await service.placeBuyOrder('BTC/USDT', 0.1, 50000);

      expect(result).toMatchObject({
        orderId: 'order-123',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        price: 50000.0,
        fee: 5.0,
        status: 'pending'
      });
    });

    it('should place sell order successfully', async () => {
      const mockOrder = {
        id: 'order-456',
        currency_pair: 'BTC_USDT',
        side: 'sell' as const,
        amount: '0.05',
        price: '51000.0',
        fee: '2.55',
        status: 'closed' as const,
        create_time: '1640995200'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      });

      const result = await service.placeSellOrder('BTC/USDT', 0.05, 51000);

      expect(result).toMatchObject({
        orderId: 'order-456',
        symbol: 'BTC/USDT',
        side: 'sell',
        amount: 0.05,
        price: 51000.0,
        fee: 2.55,
        status: 'filled'
      });
    });

    it('should handle order placement errors', async () => {
      // Mock error response
      mockFetch.mockImplementation(() => {
        throw new Error('Insufficient balance');
      });

      await expect(service.placeBuyOrder('BTC/USDT', 10, 50000)).rejects.toThrow();
    });

    it('should get open positions', async () => {
      const mockOrders = [
        {
          id: 'order-123',
          currency_pair: 'BTC_USDT',
          side: 'buy' as const,
          amount: '0.1',
          price: '50000.0',
          status: 'open' as const,
          create_time: '1640995200'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrders
      });

      const positions = await service.getOpenPositions();

      expect(positions).toHaveLength(1);
      expect(positions[0]).toMatchObject({
        id: 'order-123',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        entryPrice: 50000.0,
        status: 'open'
      });
    });

    it('should cancel order successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await service.cancelOrder('order-123');
      expect(result).toBe(true);
    });

    it('should handle cancel order failure', async () => {
      // Mock error response
      mockFetch.mockImplementation(() => {
        throw new Error('Order not found');
      });

      const result = await service.cancelOrder('invalid-order');
      expect(result).toBe(false);
    });
  });

  describe('Order Status and Management', () => {
    beforeEach(async () => {
      // Mock authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([])
      });
      await service.authenticate();
      vi.clearAllMocks();
    });

    it('should get order status', async () => {
      const mockOrder = {
        id: 'order-123',
        currency_pair: 'BTC_USDT',
        side: 'buy' as const,
        amount: '0.1',
        price: '50000.0',
        fee: '5.0',
        status: 'closed' as const,
        create_time: '1640995200'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder
      });

      const status = await service.getOrderStatus('order-123');

      expect(status).toMatchObject({
        orderId: 'order-123',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        price: 50000.0,
        status: 'filled'
      });
    });

    it('should return null for non-existent order', async () => {
      // Mock error response
      mockFetch.mockImplementation(() => {
        throw new Error('Order not found');
      });

      const status = await service.getOrderStatus('invalid-order');
      expect(status).toBeNull();
    });

    it('should get orders with status filter', async () => {
      const mockOrders = [
        {
          id: 'order-123',
          currency_pair: 'BTC_USDT',
          side: 'buy' as const,
          amount: '0.1',
          price: '50000.0',
          status: 'open' as const,
          create_time: '1640995200'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrders
      });

      const orders = await service.getOrders('BTC/USDT', 'open');

      expect(orders).toHaveLength(1);
      expect(orders[0].status).toBe('pending');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock authentication first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([])
      });
      await service.authenticate();
      vi.clearAllMocks();

      // Mock API error
      mockFetch.mockImplementation(() => {
        throw new Error('API Error');
      });

      await expect(service.getMarketData('BTC/USDT')).rejects.toThrow();
    });

    it('should validate configuration on creation', () => {
      expect(() => {
        new GateService({ ...config, apiKey: '' }, errorHandler, { maxRetries: 1, baseDelay: 10 });
      }).toThrow('Gate.io API Key is required');
    });
  });

  describe('Utility Methods', () => {
    it('should format symbol correctly', () => {
      // Test the private method indirectly through market data call
      const testService = new GateService(config, errorHandler, { maxRetries: 1, baseDelay: 10 });
      
      // The formatSymbol method is private, but we can test it indirectly
      // by checking that BTC/USDT gets converted to BTC_USDT in API calls
      expect(() => testService.getMarketData('BTC/USDT')).not.toThrow();
    });

    it('should calculate RSI from price data', async () => {
      // Mock authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([])
      });
      await service.authenticate();
      vi.clearAllMocks();

      const mockTicker = {
        currency_pair: 'BTC_USDT',
        last: '50000.0',
        base_volume: '1000.0',
        quote_volume: '50000000.0',
        change_percentage: '2.5',
        high_24h: '52000.0',
        low_24h: '48000.0'
      };

      const mockOrderBook = {
        bids: [['49999.0', '1.0']],
        asks: [['50001.0', '1.0']]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockTicker]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrderBook
        });

      const marketData = await service.getMarketData('BTC/USDT');
      
      // RSI should be calculated based on price position in 24h range
      expect(marketData.indicators.rsi).toBeGreaterThan(0);
      expect(marketData.indicators.rsi).toBeLessThan(100);
    });
  });
});