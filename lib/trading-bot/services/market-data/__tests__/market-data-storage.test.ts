import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MarketDataStorage } from '../market-data-storage';
import { MarketData } from '../../../types';

// Mock PrismaClient
const mockPrisma = {
  metrics: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn()
  }
};

describe('MarketDataStorage', () => {
  let storage: MarketDataStorage;
  let mockMarketData: MarketData;

  beforeEach(() => {
    vi.clearAllMocks();
    
    storage = new MarketDataStorage(mockPrisma as any, { 
      maxStorageSize: 1000, 
      enableAutoCleanup: false 
    });

    mockMarketData = {
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
  });

  afterEach(() => {
    storage.stopAutoCleanup();
  });

  describe('Data Storage', () => {
    it('should store market data successfully', async () => {
      vi.mocked(mockPrisma.metrics.create).mockResolvedValue({
        id: 'test-id',
        name: 'market_data_BTC/USDT',
        model: 'Deepseek',
        metrics: [mockMarketData],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(storage.storeMarketData(mockMarketData)).resolves.not.toThrow();
      
      expect(mockPrisma.metrics.create).toHaveBeenCalledWith({
        data: {
          name: 'market_data_BTC/USDT',
          model: 'Deepseek',
          metrics: [
            {
              symbol: 'BTC/USDT',
              timestamp: mockMarketData.timestamp,
              price: 50000,
              volume: 1000,
              orderBook: {
                bids: mockMarketData.orderBook.bids,
                asks: mockMarketData.orderBook.asks
              },
              indicators: {
                rsi: 55,
                macd: 0.5,
                movingAverage: 49500
              }
            }
          ]
        }
      });
    });

    it('should handle storage errors gracefully', async () => {
      vi.mocked(mockPrisma.metrics.create).mockRejectedValue(new Error('Database error'));

      await expect(storage.storeMarketData(mockMarketData)).rejects.toThrow('Database error');
    });

    it('should batch store multiple market data points', async () => {
      const dataPoints = [mockMarketData, { ...mockMarketData, symbol: 'ETH/USDT' }];
      
      vi.mocked(mockPrisma.metrics.createMany).mockResolvedValue({ count: 2 });

      await expect(storage.batchStoreMarketData(dataPoints)).resolves.not.toThrow();
      
      expect(mockPrisma.metrics.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            name: 'market_data_BTC/USDT',
            model: 'Deepseek'
          }),
          expect.objectContaining({
            name: 'market_data_ETH/USDT',
            model: 'Deepseek'
          })
        ])
      });
    });

    it('should handle empty batch gracefully', async () => {
      await expect(storage.batchStoreMarketData([])).resolves.not.toThrow();
      expect(mockPrisma.metrics.createMany).not.toHaveBeenCalled();
    });
  });

  describe('Data Retrieval', () => {
    const mockStoredRecord = {
      id: 'test-id',
      name: 'market_data_BTC/USDT',
      model: 'Deepseek',
      metrics: [
        {
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
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should retrieve historical data successfully', async () => {
      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue([mockStoredRecord]);

      const result = await storage.getHistoricalData({ symbol: 'BTC/USDT', limit: 100 });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        symbol: 'BTC/USDT',
        price: 50000,
        volume: 1000
      });
      expect(mockPrisma.metrics.findMany).toHaveBeenCalledWith({
        where: {
          name: 'market_data_BTC/USDT'
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
    });

    it('should retrieve data with time range filter', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-02');
      
      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue([mockStoredRecord]);

      await storage.getHistoricalData({
        symbol: 'BTC/USDT',
        startTime,
        endTime
      });

      expect(mockPrisma.metrics.findMany).toHaveBeenCalledWith({
        where: {
          name: 'market_data_BTC/USDT',
          createdAt: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
      });
    });

    it('should retrieve data for all symbols when no symbol specified', async () => {
      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue([mockStoredRecord]);

      await storage.getHistoricalData({ limit: 50 });

      expect(mockPrisma.metrics.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            startsWith: 'market_data_'
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    });

    it('should handle empty results gracefully', async () => {
      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue([]);

      const result = await storage.getHistoricalData({ symbol: 'NONEXISTENT/PAIR' });
      
      expect(result).toEqual([]);
    });

    it('should get price history for technical analysis', async () => {
      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue([
        mockStoredRecord,
        {
          ...mockStoredRecord,
          metrics: [{ ...mockStoredRecord.metrics[0], price: 51000 }]
        }
      ]);

      const prices = await storage.getPriceHistory('BTC/USDT', 200);
      
      expect(prices).toEqual([50000, 51000]);
    });

    it('should get volume history', async () => {
      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue([
        mockStoredRecord,
        {
          ...mockStoredRecord,
          metrics: [{ ...mockStoredRecord.metrics[0], volume: 1500 }]
        }
      ]);

      const volumes = await storage.getVolumeHistory('BTC/USDT', 200);
      
      expect(volumes).toEqual([1000, 1500]);
    });

    it('should get latest market data', async () => {
      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue([mockStoredRecord]);

      const latest = await storage.getLatestMarketData('BTC/USDT');
      
      expect(latest).toMatchObject({
        symbol: 'BTC/USDT',
        price: 50000
      });
    });

    it('should return null when no latest data exists', async () => {
      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue([]);

      const latest = await storage.getLatestMarketData('NONEXISTENT/PAIR');
      
      expect(latest).toBeNull();
    });
  });

  describe('Data Aggregation', () => {
    const mockHistoricalData = [
      {
        symbol: 'BTC/USDT',
        timestamp: new Date('2024-01-01T10:00:00Z').getTime(),
        price: 50000,
        volume: 100,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 50, macd: 0, movingAverage: 50000 }
      },
      {
        symbol: 'BTC/USDT',
        timestamp: new Date('2024-01-01T10:01:00Z').getTime(),
        price: 51000,
        volume: 150,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 55, macd: 0.1, movingAverage: 50500 }
      },
      {
        symbol: 'BTC/USDT',
        timestamp: new Date('2024-01-01T10:02:00Z').getTime(),
        price: 49000,
        volume: 200,
        orderBook: { bids: [], asks: [] },
        indicators: { rsi: 45, macd: -0.1, movingAverage: 50000 }
      }
    ];

    beforeEach(() => {
      // Mock the getHistoricalData method
      vi.spyOn(storage, 'getHistoricalData').mockResolvedValue(mockHistoricalData);
    });

    it('should calculate 1-minute aggregated data', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:03:00Z');

      const aggregated = await storage.getAggregatedData('BTC/USDT', '1m', startTime, endTime);
      
      expect(aggregated).toHaveLength(3); // 3 minutes of data
      expect(aggregated[0]).toMatchObject({
        symbol: 'BTC/USDT',
        timeframe: '1m',
        open: 50000,
        high: 50000,
        low: 50000,
        close: 50000,
        volume: 100
      });
    });

    it('should handle empty historical data for aggregation', async () => {
      vi.spyOn(storage, 'getHistoricalData').mockResolvedValue([]);

      const aggregated = await storage.getAggregatedData('BTC/USDT', '1m', new Date(), new Date());
      
      expect(aggregated).toEqual([]);
    });

    it('should calculate correct OHLCV values', async () => {
      // Mock data with multiple points in same timeframe
      const sameMinuteData = [
        { ...mockHistoricalData[0], price: 50000 },
        { ...mockHistoricalData[0], price: 52000, timestamp: mockHistoricalData[0].timestamp + 30000 },
        { ...mockHistoricalData[0], price: 48000, timestamp: mockHistoricalData[0].timestamp + 45000 },
        { ...mockHistoricalData[0], price: 51000, timestamp: mockHistoricalData[0].timestamp + 59000 }
      ];
      
      vi.spyOn(storage, 'getHistoricalData').mockResolvedValue(sameMinuteData);

      const aggregated = await storage.getAggregatedData('BTC/USDT', '1m', new Date(), new Date());
      
      expect(aggregated[0]).toMatchObject({
        open: 50000,  // First price
        high: 52000,  // Highest price
        low: 48000,   // Lowest price
        close: 51000, // Last price
        volume: 400   // Sum of volumes (4 * 100)
      });
    });
  });

  describe('Statistics and Analytics', () => {
    const mockStatsData = Array.from({ length: 10 }, (_, i) => ({
      symbol: 'BTC/USDT',
      timestamp: Date.now() - (i * 60000), // 1 minute intervals
      price: 50000 + (i * 100), // Increasing prices
      volume: 1000 + (i * 50),  // Increasing volumes
      orderBook: { bids: [], asks: [] },
      indicators: { rsi: 50, macd: 0, movingAverage: 50000 }
    }));

    beforeEach(() => {
      vi.spyOn(storage, 'getHistoricalData').mockResolvedValue(mockStatsData);
    });

    it('should calculate market data statistics', async () => {
      const stats = await storage.getMarketDataStats('BTC/USDT', 30);
      
      expect(stats).toMatchObject({
        count: 10,
        avgPrice: expect.any(Number),
        minPrice: expect.any(Number),
        maxPrice: expect.any(Number),
        totalVolume: expect.any(Number),
        avgVolume: expect.any(Number),
        priceVolatility: expect.any(Number)
      });
      
      expect(stats.count).toBe(10);
      expect(stats.minPrice).toBeLessThanOrEqual(stats.maxPrice);
      expect(stats.avgPrice).toBeGreaterThan(0);
      expect(stats.totalVolume).toBeGreaterThan(0);
    });

    it('should handle empty data for statistics', async () => {
      vi.spyOn(storage, 'getHistoricalData').mockResolvedValue([]);

      const stats = await storage.getMarketDataStats('NONEXISTENT/PAIR');
      
      expect(stats).toMatchObject({
        count: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalVolume: 0,
        avgVolume: 0,
        priceVolatility: 0
      });
    });

    it('should calculate price volatility correctly', async () => {
      // Mock data with known volatility
      const volatileData = [
        { ...mockStatsData[0], price: 50000 },
        { ...mockStatsData[0], price: 55000 },
        { ...mockStatsData[0], price: 45000 },
        { ...mockStatsData[0], price: 52000 }
      ];
      
      vi.spyOn(storage, 'getHistoricalData').mockResolvedValue(volatileData);

      const stats = await storage.getMarketDataStats('BTC/USDT');
      
      expect(stats.priceVolatility).toBeGreaterThan(0);
      expect(typeof stats.priceVolatility).toBe('number');
    });
  });

  describe('Data Cleanup', () => {
    it('should cleanup old data successfully', async () => {
      vi.mocked(mockPrisma.metrics.deleteMany).mockResolvedValue({ count: 5 });

      const deletedCount = await storage.cleanupOldData('BTC/USDT', 30);
      
      expect(deletedCount).toBe(5);
      expect(mockPrisma.metrics.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date)
          },
          name: 'market_data_BTC/USDT'
        }
      });
    });

    it('should cleanup all symbols when no symbol specified', async () => {
      vi.mocked(mockPrisma.metrics.deleteMany).mockResolvedValue({ count: 10 });

      const deletedCount = await storage.cleanupOldData(undefined, 30);
      
      expect(deletedCount).toBe(10);
      expect(mockPrisma.metrics.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date)
          },
          name: {
            startsWith: 'market_data_'
          }
        }
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(mockPrisma.metrics.deleteMany).mockRejectedValue(new Error('Cleanup failed'));

      await expect(storage.cleanupOldData('BTC/USDT')).rejects.toThrow('Cleanup failed');
    });
  });

  describe('Storage Statistics', () => {
    it('should get storage statistics', async () => {
      const mockRecords = [
        { name: 'market_data_BTC/USDT', createdAt: new Date('2024-01-01') },
        { name: 'market_data_BTC/USDT', createdAt: new Date('2024-01-02') },
        { name: 'market_data_ETH/USDT', createdAt: new Date('2024-01-01') }
      ];

      vi.mocked(mockPrisma.metrics.count).mockResolvedValue(3);
      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue(mockRecords);

      const stats = await storage.getStorageStats();
      
      expect(stats).toMatchObject({
        totalRecords: 3,
        recordsBySymbol: {
          'BTC/USDT': 2,
          'ETH/USDT': 1
        },
        oldestRecord: new Date('2024-01-01'),
        newestRecord: new Date('2024-01-02')
      });
    });

    it('should handle empty storage statistics', async () => {
      vi.mocked(mockPrisma.metrics.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue([]);

      const stats = await storage.getStorageStats();
      
      expect(stats).toMatchObject({
        totalRecords: 0,
        recordsBySymbol: {},
        oldestRecord: null,
        newestRecord: null
      });
    });
  });

  describe('Auto Cleanup', () => {
    it('should start auto cleanup when enabled', () => {
      const storageWithCleanup = new MarketDataStorage(mockPrisma as any, { 
        enableAutoCleanup: true 
      });
      
      // Auto cleanup should be started (we can't easily test the interval without waiting)
      expect(storageWithCleanup).toBeDefined();
      
      storageWithCleanup.stopAutoCleanup();
    });

    it('should stop auto cleanup', () => {
      const storageWithCleanup = new MarketDataStorage(mockPrisma as any, { 
        enableAutoCleanup: true 
      });
      
      expect(() => storageWithCleanup.stopAutoCleanup()).not.toThrow();
    });

    it('should cleanup resources', async () => {
      await expect(storage.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      vi.mocked(mockPrisma.metrics.findMany).mockRejectedValue(new Error('Connection failed'));

      await expect(storage.getHistoricalData({ symbol: 'BTC/USDT' })).rejects.toThrow('Connection failed');
    });

    it('should handle malformed stored data gracefully', async () => {
      const malformedRecord = {
        id: 'test-id',
        name: 'market_data_BTC/USDT',
        model: 'Deepseek',
        metrics: [null], // Malformed data
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockPrisma.metrics.findMany).mockResolvedValue([malformedRecord]);

      const result = await storage.getHistoricalData({ symbol: 'BTC/USDT' });
      
      // Should handle gracefully and return empty array or skip malformed records
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid timeframe for aggregation', async () => {
      vi.spyOn(storage, 'getHistoricalData').mockResolvedValue([]);

      const aggregated = await storage.getAggregatedData(
        'BTC/USDT', 
        'invalid' as any, 
        new Date(), 
        new Date()
      );
      
      expect(aggregated).toEqual([]);
    });
  });
});