import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { 
  TradingPositionRepository, 
  TradeExecutionRepository, 
  TradingSignalRepository, 
  MarketDataRepository 
} from '../index';

// Mock Prisma Client
const mockPrisma = {
  tradingPosition: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  },
  tradeExecution: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn()
  },
  tradingSignal: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    deleteMany: vi.fn()
  },
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
  }
} as any;

describe('Repository Tests', () => {
  let tradingPositionRepo: TradingPositionRepository;
  let tradeExecutionRepo: TradeExecutionRepository;
  let tradingSignalRepo: TradingSignalRepository;
  let marketDataRepo: MarketDataRepository;

  beforeEach(() => {
    tradingPositionRepo = new TradingPositionRepository(mockPrisma);
    tradeExecutionRepo = new TradeExecutionRepository(mockPrisma);
    tradingSignalRepo = new TradingSignalRepository(mockPrisma);
    marketDataRepo = new MarketDataRepository(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('TradingPositionRepository', () => {
    it('should create a new trading position', async () => {
      const positionData = {
        symbol: 'BTC/USDT',
        side: 'BUY' as any,
        amount: 0.1,
        entryPrice: 45000
      };

      const expectedPosition = {
        id: 'test-id',
        ...positionData,
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
        tradeExecutions: []
      };

      mockPrisma.tradingPosition.create = vi.fn().mockResolvedValue(expectedPosition);

      const result = await tradingPositionRepo.create(positionData);

      expect(mockPrisma.tradingPosition.create).toHaveBeenCalledWith({
        data: positionData,
        include: {
          tradeExecutions: true
        }
      });
      expect(result).toEqual(expectedPosition);
    });

    it('should find open positions', async () => {
      const openPositions = [
        {
          id: 'pos1',
          symbol: 'BTC/USDT',
          side: 'BUY',
          amount: 0.1,
          entryPrice: 45000,
          status: 'OPEN',
          tradeExecutions: []
        }
      ];

      mockPrisma.tradingPosition.findMany = vi.fn().mockResolvedValue(openPositions);

      const result = await tradingPositionRepo.findOpenPositions();

      expect(mockPrisma.tradingPosition.findMany).toHaveBeenCalledWith({
        where: {
          status: 'OPEN'
        },
        include: {
          tradeExecutions: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(result).toEqual(openPositions);
    });

    it('should handle database errors', async () => {
      const positionData = {
        symbol: 'BTC/USDT',
        side: 'BUY' as any,
        amount: 0.1,
        entryPrice: 45000
      };

      mockPrisma.tradingPosition.create = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(tradingPositionRepo.create(positionData)).rejects.toThrow('Database operation failed: create trading position');
    });
  });

  describe('TradeExecutionRepository', () => {
    it('should create a new trade execution', async () => {
      const executionData = {
        orderId: 'order-123',
        symbol: 'BTC/USDT',
        side: 'BUY' as any,
        amount: 0.1,
        price: 45000
      };

      const expectedExecution = {
        id: 'exec-123',
        ...executionData,
        fee: 0,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        position: null
      };

      mockPrisma.tradeExecution.create = vi.fn().mockResolvedValue(expectedExecution);

      const result = await tradeExecutionRepo.create(executionData);

      expect(mockPrisma.tradeExecution.create).toHaveBeenCalledWith({
        data: executionData,
        include: {
          position: true
        }
      });
      expect(result).toEqual(expectedExecution);
    });

    it('should find pending executions', async () => {
      const pendingExecutions = [
        {
          id: 'exec1',
          orderId: 'order1',
          symbol: 'BTC/USDT',
          side: 'BUY',
          amount: 0.1,
          price: 45000,
          status: 'PENDING',
          position: null
        }
      ];

      mockPrisma.tradeExecution.findMany = vi.fn().mockResolvedValue(pendingExecutions);

      const result = await tradeExecutionRepo.findPending();

      expect(mockPrisma.tradeExecution.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING'
        },
        include: {
          position: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      expect(result).toEqual(pendingExecutions);
    });
  });

  describe('TradingSignalRepository', () => {
    it('should create a new trading signal', async () => {
      const signalData = {
        symbol: 'BTC/USDT',
        action: 'BUY' as any,
        confidence: 0.85
      };

      const expectedSignal = {
        id: 'signal-123',
        ...signalData,
        createdAt: new Date()
      };

      mockPrisma.tradingSignal.create = vi.fn().mockResolvedValue(expectedSignal);

      const result = await tradingSignalRepo.create(signalData);

      expect(mockPrisma.tradingSignal.create).toHaveBeenCalledWith({
        data: signalData
      });
      expect(result).toEqual(expectedSignal);
    });

    it('should find recent signals', async () => {
      const recentSignals = [
        {
          id: 'signal1',
          symbol: 'BTC/USDT',
          action: 'BUY',
          confidence: 0.85,
          createdAt: new Date()
        }
      ];

      mockPrisma.tradingSignal.findMany = vi.fn().mockResolvedValue(recentSignals);

      const result = await tradingSignalRepo.findRecent(10);

      expect(mockPrisma.tradingSignal.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });
      expect(result).toEqual(recentSignals);
    });

    it('should cleanup old signals', async () => {
      const mockDeleteResult = { count: 15 };

      mockPrisma.tradingSignal.deleteMany = vi.fn().mockResolvedValue(mockDeleteResult);

      const result = await tradingSignalRepo.cleanupOldSignals(30);

      expect(mockPrisma.tradingSignal.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date)
          }
        }
      });
      expect(result).toBe(15);
    });
  });

  describe('MarketDataRepository', () => {
    it('should create new market data entry', async () => {
      const marketDataInput = {
        symbol: 'BTC/USDT',
        price: 45000,
        volume: 1000,
        timestamp: new Date()
      };

      const expectedMarketData = {
        id: 'market-data-123',
        ...marketDataInput,
        createdAt: new Date()
      };

      mockPrisma.marketData.create = vi.fn().mockResolvedValue(expectedMarketData);

      const result = await marketDataRepo.create(marketDataInput);

      expect(mockPrisma.marketData.create).toHaveBeenCalledWith({
        data: marketDataInput
      });
      expect(result).toEqual(expectedMarketData);
    });

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

      const result = await marketDataRepo.findLatestBySymbol(symbol);

      expect(mockPrisma.marketData.findFirst).toHaveBeenCalledWith({
        where: { symbol },
        orderBy: {
          timestamp: 'desc'
        }
      });
      expect(result).toEqual(latestData);
    });

    it('should bulk create market data', async () => {
      const dataArray = [
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

      const result = await marketDataRepo.bulkCreate(dataArray);

      expect(mockPrisma.marketData.createMany).toHaveBeenCalledWith({
        data: dataArray,
        skipDuplicates: true
      });
      expect(result).toBe(2);
    });

    it('should cleanup old market data', async () => {
      const mockDeleteResult = { count: 500 };

      mockPrisma.marketData.deleteMany = vi.fn().mockResolvedValue(mockDeleteResult);

      const result = await marketDataRepo.cleanupOldData(30);

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
});