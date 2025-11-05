import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { MarketDataRepository, CreateMarketDataData, UpdateMarketDataData } from '../market-data-repository';

// Mock Prisma Client
const mockPrisma = {
  marketData: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn()
  },
  // Add other required Prisma client properties to avoid type errors
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $queryRaw: vi.fn(),
  $transaction: vi.fn()
} as any;

describe('MarketDataRepository', () => {
  let repository: MarketDataRepository;

  beforeEach(() => {
    repository = new MarketDataRepository(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create new market data entry', async () => {
      const marketDataInput: CreateMarketDataData = {
        symbol: 'BTC/USDT',
        price: 45000,
        volume: 1000,
        orderBook: {
          bids: [{ price: 44900, amount: 1 }],
          asks: [{ price: 45100, amount: 1 }]
        },
        rsi: 65,
        macd: 0.5,
        movingAverage: 44500,
        timestamp: new Date()
      };

      const expectedMarketData = {
        id: 'market-data-123',
        ...marketDataInput,
        createdAt: new Date()
      };

      mockPrisma.marketData.create = vi.fn().mockResolvedValue(expectedMarketData);

      const result = await repository.create(marketDataInput);

      expect(mockPrisma.marketData.create).toHaveBeenCalledWith({
        data: marketDataInput
      });
      expect(result).toEqual(expectedMarketData);
    });

    it('should handle database errors during creation', async () => {
      const marketDataInput: CreateMarketDataData = {
        symbol: 'BTC/USDT',
        price: 45000,
        volume: 1000,
        timestamp: new Date()
      };

      mockPrisma.marketData.create = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(repository.create(marketDataInput)).rejects.toThrow('Database operation failed: create market data');
    });
  });

  describe('findLatestBySymbol', () => {
    it('should find latest market data for symbol', async () => {
      const symbol = 'BTC/USDT';
      const latestData = {
        id: 'market-data-123',
        symbol,
        price: 45000,
        volume: 1000,
        timestamp: new Date(),
        createdAt: new Date()
      };

      mockPrisma.marketData.findFirst = vi.fn().mockResolvedValue(latestData);

      const result = await repository.findLatestBySymbol(symbol);

      expect(mockPrisma.marketData.findFirst).toHaveBeenCalledWith({
        where: { symbol },
        orderBy: {
          timestamp: 'desc'
        }
      });
      expect(result).toEqual(latestData);
    });

    it('should return null when no data found', async () => {
      mockPrisma.marketData.findFirst = vi.fn().mockResolvedValue(null);

      const result = await repository.findLatestBySymbol('NON/EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('findBySymbolAndTimeRange', () => {
    it('should find market data by symbol within time range', async () => {
      const symbol = 'BTC/USDT';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');

      const marketDataArray = [
        {
          id: 'data1',
          symbol,
          price: 45000,
          volume: 1000,
          timestamp: new Date('2024-01-01T12:00:00Z')
        },
        {
          id: 'data2',
          symbol,
          price: 45100,
          volume: 1100,
          timestamp: new Date('2024-01-01T13:00:00Z')
        }
      ];

      mockPrisma.marketData.findMany = vi.fn().mockResolvedValue(marketDataArray);

      const result = await repository.findBySymbolAndTimeRange(symbol, startTime, endTime);

      expect(mockPrisma.marketData.findMany).toHaveBeenCalledWith({
        where: {
          symbol,
          timestamp: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });
      expect(result).toEqual(marketDataArray);
    });
  });

  describe('findRecentBySymbol', () => {
    it('should find recent market data for symbol', async () => {
      const symbol = 'BTC/USDT';
      const limit = 50;

      const recentData = [
        {
          id: 'data1',
          symbol,
          price: 45000,
          volume: 1000,
          timestamp: new Date()
        }
      ];

      mockPrisma.marketData.findMany = vi.fn().mockResolvedValue(recentData);

      const result = await repository.findRecentBySymbol(symbol, limit);

      expect(mockPrisma.marketData.findMany).toHaveBeenCalledWith({
        where: { symbol },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      });
      expect(result).toEqual(recentData);
    });

    it('should use default limit when not specified', async () => {
      const symbol = 'BTC/USDT';

      mockPrisma.marketData.findMany = vi.fn().mockResolvedValue([]);

      await repository.findRecentBySymbol(symbol);

      expect(mockPrisma.marketData.findMany).toHaveBeenCalledWith({
        where: { symbol },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100
      });
    });
  });

  describe('findWithIndicators', () => {
    it('should find market data with technical indicators', async () => {
      const symbol = 'BTC/USDT';
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-31');

      const dataWithIndicators = [
        {
          id: 'data1',
          symbol,
          price: 45000,
          volume: 1000,
          rsi: 65,
          macd: 0.5,
          movingAverage: 44500,
          timestamp: new Date()
        }
      ];

      mockPrisma.marketData.findMany = vi.fn().mockResolvedValue(dataWithIndicators);

      const result = await repository.findWithIndicators(symbol, startTime, endTime);

      expect(mockPrisma.marketData.findMany).toHaveBeenCalledWith({
        where: {
          symbol,
          OR: [
            { rsi: { not: null } },
            { macd: { not: null } },
            { movingAverage: { not: null } }
          ],
          timestamp: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });
      expect(result).toEqual(dataWithIndicators);
    });
  });

  describe('update', () => {
    it('should update market data', async () => {
      const dataId = 'market-data-123';
      const updateData: UpdateMarketDataData = {
        price: 46000,
        volume: 1200,
        rsi: 70
      };

      const updatedData = {
        id: dataId,
        symbol: 'BTC/USDT',
        price: 46000,
        volume: 1200,
        rsi: 70,
        timestamp: new Date(),
        createdAt: new Date()
      };

      mockPrisma.marketData.update = vi.fn().mockResolvedValue(updatedData);

      const result = await repository.update(dataId, updateData);

      expect(mockPrisma.marketData.update).toHaveBeenCalledWith({
        where: { id: dataId },
        data: updateData
      });
      expect(result).toEqual(updatedData);
    });
  });

  describe('getPriceStats', () => {
    it('should get price statistics for symbol', async () => {
      const symbol = 'BTC/USDT';
      const mockAggregateResult = {
        _count: { id: 100 },
        _avg: { price: 45000, volume: 1000 },
        _min: { price: 44000 },
        _max: { price: 46000 }
      };

      mockPrisma.marketData.aggregate = vi.fn().mockResolvedValue(mockAggregateResult);

      const result = await repository.getPriceStats(symbol);

      expect(mockPrisma.marketData.aggregate).toHaveBeenCalledWith({
        where: { symbol },
        _count: { id: true },
        _avg: { price: true, volume: true },
        _min: { price: true },
        _max: { price: true }
      });

      expect(result).toEqual({
        count: 100,
        averagePrice: 45000,
        averageVolume: 1000,
        minPrice: 44000,
        maxPrice: 46000
      });
    });

    it('should handle null aggregate results', async () => {
      const mockAggregateResult = {
        _count: { id: 0 },
        _avg: { price: null, volume: null },
        _min: { price: null },
        _max: { price: null }
      };

      mockPrisma.marketData.aggregate = vi.fn().mockResolvedValue(mockAggregateResult);

      const result = await repository.getPriceStats('BTC/USDT');

      expect(result).toEqual({
        count: 0,
        averagePrice: 0,
        averageVolume: 0,
        minPrice: 0,
        maxPrice: 0
      });
    });
  });

  describe('cleanupOldData', () => {
    it('should cleanup old market data', async () => {
      const daysToKeep = 30;
      const mockDeleteResult = { count: 500 };

      mockPrisma.marketData.deleteMany = vi.fn().mockResolvedValue(mockDeleteResult);

      const result = await repository.cleanupOldData(daysToKeep);

      expect(mockPrisma.marketData.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: expect.any(Date)
          }
        }
      });
      expect(result).toBe(500);
    });
  });

  describe('bulkCreate', () => {
    it('should bulk insert market data', async () => {
      const dataArray: CreateMarketDataData[] = [
        {
          symbol: 'BTC/USDT',
          price: 45000,
          volume: 1000,
          timestamp: new Date()
        },
        {
          symbol: 'ETH/USDT',
          price: 3000,
          volume: 2000,
          timestamp: new Date()
        }
      ];

      const mockCreateResult = { count: 2 };

      mockPrisma.marketData.createMany = vi.fn().mockResolvedValue(mockCreateResult);

      const result = await repository.bulkCreate(dataArray);

      expect(mockPrisma.marketData.createMany).toHaveBeenCalledWith({
        data: dataArray,
        skipDuplicates: true
      });
      expect(result).toBe(2);
    });
  });

  describe('getOHLCVData', () => {
    it('should get OHLCV data for charting', async () => {
      const symbol = 'BTC/USDT';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');
      const intervalMinutes = 5;

      const rawData = [
        {
          symbol,
          price: 45000,
          volume: 100,
          timestamp: new Date('2024-01-01T00:00:00Z')
        },
        {
          symbol,
          price: 45100,
          volume: 150,
          timestamp: new Date('2024-01-01T00:02:00Z')
        },
        {
          symbol,
          price: 44900,
          volume: 120,
          timestamp: new Date('2024-01-01T00:04:00Z')
        },
        {
          symbol,
          price: 45200,
          volume: 200,
          timestamp: new Date('2024-01-01T00:05:00Z')
        }
      ];

      mockPrisma.marketData.findMany = vi.fn().mockResolvedValue(rawData);

      const result = await repository.getOHLCVData(symbol, startTime, endTime, intervalMinutes);

      expect(mockPrisma.marketData.findMany).toHaveBeenCalledWith({
        where: {
          symbol,
          timestamp: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      expect(result).toHaveLength(2); // Two 5-minute intervals
      expect(result[0]).toMatchObject({
        timestamp: new Date('2024-01-01T00:00:00Z'),
        open: 45000,
        high: 45100,
        low: 44900,
        close: 44900,
        volume: 370 // 100 + 150 + 120
      });
      expect(result[1]).toMatchObject({
        timestamp: new Date('2024-01-01T00:05:00Z'),
        open: 45200,
        high: 45200,
        low: 45200,
        close: 45200,
        volume: 200
      });
    });
  });

  describe('findWithPagination', () => {
    it('should find market data with pagination', async () => {
      const data = [
        {
          id: 'data1',
          symbol: 'BTC/USDT',
          price: 45000,
          volume: 1000,
          timestamp: new Date()
        }
      ];

      mockPrisma.marketData.findMany = vi.fn().mockResolvedValue(data);
      mockPrisma.marketData.count = vi.fn().mockResolvedValue(1);

      const result = await repository.findWithPagination(1, 10, 'BTC/USDT');

      expect(mockPrisma.marketData.findMany).toHaveBeenCalledWith({
        where: {
          symbol: 'BTC/USDT'
        },
        orderBy: {
          timestamp: 'desc'
        },
        skip: 0,
        take: 10
      });
      expect(mockPrisma.marketData.count).toHaveBeenCalledWith({
        where: {
          symbol: 'BTC/USDT'
        }
      });
      expect(result).toEqual({ data, total: 1 });
    });
  });

  describe('delete', () => {
    it('should delete market data', async () => {
      const dataId = 'market-data-123';

      mockPrisma.marketData.delete = vi.fn().mockResolvedValue({});

      await repository.delete(dataId);

      expect(mockPrisma.marketData.delete).toHaveBeenCalledWith({
        where: { id: dataId }
      });
    });
  });
});