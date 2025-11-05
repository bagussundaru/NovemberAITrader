import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient, SignalAction } from '@prisma/client';
import { TradingSignalRepository, CreateTradingSignalData } from '../trading-signal-repository';

// Mock Prisma Client
const mockPrisma = {
  tradingSignal: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    deleteMany: vi.fn()
  }
} as unknown as PrismaClient;

describe('TradingSignalRepository', () => {
  let repository: TradingSignalRepository;

  beforeEach(() => {
    repository = new TradingSignalRepository(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new trading signal', async () => {
      const signalData: CreateTradingSignalData = {
        symbol: 'BTC/USDT',
        action: SignalAction.BUY,
        confidence: 0.85,
        targetPrice: 46000,
        stopLoss: 44000,
        reasoning: 'Strong bullish momentum detected'
      };

      const expectedSignal = {
        id: 'signal-123',
        ...signalData,
        createdAt: new Date()
      };

      mockPrisma.tradingSignal.create = vi.fn().mockResolvedValue(expectedSignal);

      const result = await repository.create(signalData);

      expect(mockPrisma.tradingSignal.create).toHaveBeenCalledWith({
        data: signalData
      });
      expect(result).toEqual(expectedSignal);
    });

    it('should handle database errors during creation', async () => {
      const signalData: CreateTradingSignalData = {
        symbol: 'BTC/USDT',
        action: SignalAction.BUY,
        confidence: 0.85
      };

      mockPrisma.tradingSignal.create = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(repository.create(signalData)).rejects.toThrow('Database operation failed: create trading signal');
    });
  });

  describe('findById', () => {
    it('should find trading signal by ID', async () => {
      const signalId = 'signal-123';
      const expectedSignal = {
        id: signalId,
        symbol: 'BTC/USDT',
        action: SignalAction.BUY,
        confidence: 0.85,
        targetPrice: 46000,
        stopLoss: 44000,
        reasoning: 'Strong bullish momentum detected',
        createdAt: new Date()
      };

      mockPrisma.tradingSignal.findUnique = vi.fn().mockResolvedValue(expectedSignal);

      const result = await repository.findById(signalId);

      expect(mockPrisma.tradingSignal.findUnique).toHaveBeenCalledWith({
        where: { id: signalId }
      });
      expect(result).toEqual(expectedSignal);
    });

    it('should return null when signal not found', async () => {
      mockPrisma.tradingSignal.findUnique = vi.fn().mockResolvedValue(null);

      const result = await repository.findById('non-existent-signal');

      expect(result).toBeNull();
    });
  });

  describe('findBySymbol', () => {
    it('should find trading signals by symbol', async () => {
      const symbol = 'BTC/USDT';
      const signals = [
        {
          id: 'signal1',
          symbol,
          action: SignalAction.BUY,
          confidence: 0.85,
          createdAt: new Date()
        },
        {
          id: 'signal2',
          symbol,
          action: SignalAction.SELL,
          confidence: 0.75,
          createdAt: new Date()
        }
      ];

      mockPrisma.tradingSignal.findMany = vi.fn().mockResolvedValue(signals);

      const result = await repository.findBySymbol(symbol);

      expect(mockPrisma.tradingSignal.findMany).toHaveBeenCalledWith({
        where: {
          symbol
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(result).toEqual(signals);
    });

    it('should find trading signals by symbol and action', async () => {
      const symbol = 'BTC/USDT';
      const action = SignalAction.BUY;

      mockPrisma.tradingSignal.findMany = vi.fn().mockResolvedValue([]);

      await repository.findBySymbol(symbol, action);

      expect(mockPrisma.tradingSignal.findMany).toHaveBeenCalledWith({
        where: {
          symbol,
          action
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });
  });

  describe('findRecent', () => {
    it('should find recent trading signals', async () => {
      const recentSignals = [
        {
          id: 'signal1',
          symbol: 'BTC/USDT',
          action: SignalAction.BUY,
          confidence: 0.85,
          createdAt: new Date()
        },
        {
          id: 'signal2',
          symbol: 'ETH/USDT',
          action: SignalAction.SELL,
          confidence: 0.75,
          createdAt: new Date()
        }
      ];

      mockPrisma.tradingSignal.findMany = vi.fn().mockResolvedValue(recentSignals);

      const result = await repository.findRecent(10, 'BTC/USDT');

      expect(mockPrisma.tradingSignal.findMany).toHaveBeenCalledWith({
        where: {
          symbol: 'BTC/USDT'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });
      expect(result).toEqual(recentSignals);
    });

    it('should find recent signals without symbol filter', async () => {
      mockPrisma.tradingSignal.findMany = vi.fn().mockResolvedValue([]);

      await repository.findRecent(5);

      expect(mockPrisma.tradingSignal.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });
    });
  });

  describe('findByAction', () => {
    it('should find trading signals by action', async () => {
      const action = SignalAction.BUY;
      const buySignals = [
        {
          id: 'signal1',
          symbol: 'BTC/USDT',
          action,
          confidence: 0.85,
          createdAt: new Date()
        }
      ];

      mockPrisma.tradingSignal.findMany = vi.fn().mockResolvedValue(buySignals);

      const result = await repository.findByAction(action, 'BTC/USDT');

      expect(mockPrisma.tradingSignal.findMany).toHaveBeenCalledWith({
        where: {
          action,
          symbol: 'BTC/USDT'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(result).toEqual(buySignals);
    });
  });

  describe('findByDateRange', () => {
    it('should find trading signals within date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const symbol = 'BTC/USDT';
      const action = SignalAction.BUY;

      const signals = [
        {
          id: 'signal1',
          symbol,
          action,
          confidence: 0.85,
          createdAt: new Date('2024-01-15')
        }
      ];

      mockPrisma.tradingSignal.findMany = vi.fn().mockResolvedValue(signals);

      const result = await repository.findByDateRange(startDate, endDate, symbol, action);

      expect(mockPrisma.tradingSignal.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          symbol,
          action
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(result).toEqual(signals);
    });
  });

  describe('getSignalStats', () => {
    it('should get signal statistics', async () => {
      const symbol = 'BTC/USDT';
      const mockAggregateResult = {
        _count: { id: 20 },
        _avg: { confidence: 0.8 }
      };

      mockPrisma.tradingSignal.aggregate = vi.fn().mockResolvedValue(mockAggregateResult);
      mockPrisma.tradingSignal.count = vi.fn()
        .mockResolvedValueOnce(8) // buy signals
        .mockResolvedValueOnce(7) // sell signals
        .mockResolvedValueOnce(5); // hold signals

      const result = await repository.getSignalStats(symbol);

      expect(mockPrisma.tradingSignal.aggregate).toHaveBeenCalledWith({
        where: { symbol },
        _count: { id: true },
        _avg: { confidence: true }
      });

      expect(result).toEqual({
        totalSignals: 20,
        averageConfidence: 0.8,
        buySignals: 8,
        sellSignals: 7,
        holdSignals: 5
      });
    });

    it('should handle null aggregate results', async () => {
      const mockAggregateResult = {
        _count: { id: 0 },
        _avg: { confidence: null }
      };

      mockPrisma.tradingSignal.aggregate = vi.fn().mockResolvedValue(mockAggregateResult);
      mockPrisma.tradingSignal.count = vi.fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await repository.getSignalStats();

      expect(result).toEqual({
        totalSignals: 0,
        averageConfidence: 0,
        buySignals: 0,
        sellSignals: 0,
        holdSignals: 0
      });
    });
  });

  describe('cleanupOldSignals', () => {
    it('should cleanup old signals', async () => {
      const daysToKeep = 30;
      const mockDeleteResult = { count: 15 };

      mockPrisma.tradingSignal.deleteMany = vi.fn().mockResolvedValue(mockDeleteResult);

      const result = await repository.cleanupOldSignals(daysToKeep);

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

  describe('findWithPagination', () => {
    it('should find trading signals with pagination', async () => {
      const signals = [
        {
          id: 'signal1',
          symbol: 'BTC/USDT',
          action: SignalAction.BUY,
          confidence: 0.85,
          createdAt: new Date()
        }
      ];

      mockPrisma.tradingSignal.findMany = vi.fn().mockResolvedValue(signals);
      mockPrisma.tradingSignal.count = vi.fn().mockResolvedValue(1);

      const result = await repository.findWithPagination(1, 10, 'BTC/USDT', SignalAction.BUY);

      expect(mockPrisma.tradingSignal.findMany).toHaveBeenCalledWith({
        where: {
          symbol: 'BTC/USDT',
          action: SignalAction.BUY
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: 0,
        take: 10
      });
      expect(mockPrisma.tradingSignal.count).toHaveBeenCalledWith({
        where: {
          symbol: 'BTC/USDT',
          action: SignalAction.BUY
        }
      });
      expect(result).toEqual({ signals, total: 1 });
    });
  });

  describe('delete', () => {
    it('should delete trading signal', async () => {
      const signalId = 'signal-123';

      mockPrisma.tradingSignal.delete = vi.fn().mockResolvedValue({});

      await repository.delete(signalId);

      expect(mockPrisma.tradingSignal.delete).toHaveBeenCalledWith({
        where: { id: signalId }
      });
    });
  });
});