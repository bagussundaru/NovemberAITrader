import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TradingPositionRepository, CreateTradingPositionData, UpdateTradingPositionData } from '../trading-position-repository';

// Mock Prisma Client
const mockPrisma = {
  tradingPosition: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  }
} as unknown as PrismaClient;

describe('TradingPositionRepository', () => {
  let repository: TradingPositionRepository;

  beforeEach(() => {
    repository = new TradingPositionRepository(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new trading position', async () => {
      const positionData: CreateTradingPositionData = {
        symbol: 'BTC/USDT',
        side: 'BUY' as any,
        amount: 0.1,
        entryPrice: 45000,
        currentPrice: 45000,
        unrealizedPnL: 0
      };

      const expectedPosition = {
        id: 'test-id',
        ...positionData,
        status: 'OPEN' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        tradeExecutions: []
      };

      mockPrisma.tradingPosition.create = vi.fn().mockResolvedValue(expectedPosition);

      const result = await repository.create(positionData);

      expect(mockPrisma.tradingPosition.create).toHaveBeenCalledWith({
        data: positionData,
        include: {
          tradeExecutions: true
        }
      });
      expect(result).toEqual(expectedPosition);
    });

    it('should handle database errors during creation', async () => {
      const positionData: CreateTradingPositionData = {
        symbol: 'BTC/USDT',
        side: 'BUY' as any,
        amount: 0.1,
        entryPrice: 45000
      };

      mockPrisma.tradingPosition.create = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(repository.create(positionData)).rejects.toThrow('Database operation failed: create trading position');
    });
  });

  describe('findById', () => {
    it('should find position by ID', async () => {
      const positionId = 'test-id';
      const expectedPosition = {
        id: positionId,
        symbol: 'BTC/USDT',
        side: 'BUY' as any,
        amount: 0.1,
        entryPrice: 45000,
        currentPrice: 45000,
        unrealizedPnL: 0,
        status: 'OPEN' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        tradeExecutions: []
      };

      mockPrisma.tradingPosition.findUnique = vi.fn().mockResolvedValue(expectedPosition);

      const result = await repository.findById(positionId);

      expect(mockPrisma.tradingPosition.findUnique).toHaveBeenCalledWith({
        where: { id: positionId },
        include: {
          tradeExecutions: true
        }
      });
      expect(result).toEqual(expectedPosition);
    });

    it('should return null when position not found', async () => {
      mockPrisma.tradingPosition.findUnique = vi.fn().mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findOpenPositions', () => {
    it('should find all open positions', async () => {
      const openPositions = [
        {
          id: 'pos1',
          symbol: 'BTC/USDT',
          side: 'BUY' as any,
          amount: 0.1,
          entryPrice: 45000,
          status: 'OPEN' as any,
          tradeExecutions: []
        },
        {
          id: 'pos2',
          symbol: 'ETH/USDT',
          side: 'BUY' as any,
          amount: 1.0,
          entryPrice: 3000,
          status: 'OPEN' as any,
          tradeExecutions: []
        }
      ];

      mockPrisma.tradingPosition.findMany = vi.fn().mockResolvedValue(openPositions);

      const result = await repository.findOpenPositions();

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
  });

  describe('findBySymbol', () => {
    it('should find positions by symbol', async () => {
      const symbol = 'BTC/USDT';
      const positions = [
        {
          id: 'pos1',
          symbol,
          side: 'BUY' as any,
          amount: 0.1,
          entryPrice: 45000,
          status: 'OPEN' as any,
          tradeExecutions: []
        }
      ];

      mockPrisma.tradingPosition.findMany = vi.fn().mockResolvedValue(positions);

      const result = await repository.findBySymbol(symbol);

      expect(mockPrisma.tradingPosition.findMany).toHaveBeenCalledWith({
        where: {
          symbol
        },
        include: {
          tradeExecutions: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(result).toEqual(positions);
    });

    it('should find positions by symbol and status', async () => {
      const symbol = 'BTC/USDT';
      const status = 'OPEN' as any;

      mockPrisma.tradingPosition.findMany = vi.fn().mockResolvedValue([]);

      await repository.findBySymbol(symbol, status);

      expect(mockPrisma.tradingPosition.findMany).toHaveBeenCalledWith({
        where: {
          symbol,
          status
        },
        include: {
          tradeExecutions: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });
  });

  describe('update', () => {
    it('should update position', async () => {
      const positionId = 'test-id';
      const updateData: UpdateTradingPositionData = {
        currentPrice: 46000,
        unrealizedPnL: 100
      };

      const updatedPosition = {
        id: positionId,
        symbol: 'BTC/USDT',
        side: 'BUY' as any,
        amount: 0.1,
        entryPrice: 45000,
        currentPrice: 46000,
        unrealizedPnL: 100,
        status: 'OPEN' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        tradeExecutions: []
      };

      mockPrisma.tradingPosition.update = vi.fn().mockResolvedValue(updatedPosition);

      const result = await repository.update(positionId, updateData);

      expect(mockPrisma.tradingPosition.update).toHaveBeenCalledWith({
        where: { id: positionId },
        data: updateData,
        include: {
          tradeExecutions: true
        }
      });
      expect(result).toEqual(updatedPosition);
    });
  });

  describe('closePosition', () => {
    it('should close position', async () => {
      const positionId = 'test-id';
      const closedPosition = {
        id: positionId,
        symbol: 'BTC/USDT',
        side: 'BUY' as any,
        amount: 0.1,
        entryPrice: 45000,
        status: 'CLOSED' as any,
        tradeExecutions: []
      };

      mockPrisma.tradingPosition.update = vi.fn().mockResolvedValue(closedPosition);

      const result = await repository.closePosition(positionId);

      expect(mockPrisma.tradingPosition.update).toHaveBeenCalledWith({
        where: { id: positionId },
        data: {
          status: 'CLOSED'
        },
        include: {
          tradeExecutions: true
        }
      });
      expect(result).toEqual(closedPosition);
    });
  });

  describe('findWithPagination', () => {
    it('should find positions with pagination', async () => {
      const positions = [
        {
          id: 'pos1',
          symbol: 'BTC/USDT',
          side: 'BUY' as any,
          amount: 0.1,
          entryPrice: 45000,
          status: 'OPEN' as any,
          tradeExecutions: []
        }
      ];

      mockPrisma.tradingPosition.findMany = vi.fn().mockResolvedValue(positions);
      mockPrisma.tradingPosition.count = vi.fn().mockResolvedValue(1);

      const result = await repository.findWithPagination(1, 10, 'BTC/USDT', 'OPEN' as any);

      expect(mockPrisma.tradingPosition.findMany).toHaveBeenCalledWith({
        where: {
          symbol: 'BTC/USDT',
          status: 'OPEN'
        },
        include: {
          tradeExecutions: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: 0,
        take: 10
      });
      expect(mockPrisma.tradingPosition.count).toHaveBeenCalledWith({
        where: {
          symbol: 'BTC/USDT',
          status: 'OPEN'
        }
      });
      expect(result).toEqual({ positions, total: 1 });
    });
  });

  describe('delete', () => {
    it('should delete position', async () => {
      const positionId = 'test-id';

      mockPrisma.tradingPosition.delete = vi.fn().mockResolvedValue({});

      await repository.delete(positionId);

      expect(mockPrisma.tradingPosition.delete).toHaveBeenCalledWith({
        where: { id: positionId }
      });
    });
  });
});