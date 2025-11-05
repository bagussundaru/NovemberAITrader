import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient, TradeSide, TradeStatus } from '@prisma/client';
import { TradeExecutionRepository, CreateTradeExecutionData, UpdateTradeExecutionData } from '../trade-execution-repository';

// Mock Prisma Client
const mockPrisma = {
  tradeExecution: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn()
  }
} as unknown as PrismaClient;

describe('TradeExecutionRepository', () => {
  let repository: TradeExecutionRepository;

  beforeEach(() => {
    repository = new TradeExecutionRepository(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new trade execution', async () => {
      const executionData: CreateTradeExecutionData = {
        orderId: 'order-123',
        symbol: 'BTC/USDT',
        side: TradeSide.BUY,
        amount: 0.1,
        price: 45000,
        fee: 4.5,
        status: TradeStatus.FILLED,
        positionId: 'position-123'
      };

      const expectedExecution = {
        id: 'exec-123',
        ...executionData,
        createdAt: new Date(),
        updatedAt: new Date(),
        position: null
      };

      mockPrisma.tradeExecution.create = vi.fn().mockResolvedValue(expectedExecution);

      const result = await repository.create(executionData);

      expect(mockPrisma.tradeExecution.create).toHaveBeenCalledWith({
        data: executionData,
        include: {
          position: true
        }
      });
      expect(result).toEqual(expectedExecution);
    });

    it('should handle database errors during creation', async () => {
      const executionData: CreateTradeExecutionData = {
        orderId: 'order-123',
        symbol: 'BTC/USDT',
        side: TradeSide.BUY,
        amount: 0.1,
        price: 45000
      };

      mockPrisma.tradeExecution.create = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(repository.create(executionData)).rejects.toThrow('Database operation failed: create trade execution');
    });
  });

  describe('findByOrderId', () => {
    it('should find trade execution by order ID', async () => {
      const orderId = 'order-123';
      const expectedExecution = {
        id: 'exec-123',
        orderId,
        symbol: 'BTC/USDT',
        side: TradeSide.BUY,
        amount: 0.1,
        price: 45000,
        fee: 4.5,
        status: TradeStatus.FILLED,
        createdAt: new Date(),
        updatedAt: new Date(),
        position: null
      };

      mockPrisma.tradeExecution.findUnique = vi.fn().mockResolvedValue(expectedExecution);

      const result = await repository.findByOrderId(orderId);

      expect(mockPrisma.tradeExecution.findUnique).toHaveBeenCalledWith({
        where: { orderId },
        include: {
          position: true
        }
      });
      expect(result).toEqual(expectedExecution);
    });

    it('should return null when execution not found', async () => {
      mockPrisma.tradeExecution.findUnique = vi.fn().mockResolvedValue(null);

      const result = await repository.findByOrderId('non-existent-order');

      expect(result).toBeNull();
    });
  });

  describe('findBySymbol', () => {
    it('should find trade executions by symbol', async () => {
      const symbol = 'BTC/USDT';
      const executions = [
        {
          id: 'exec1',
          orderId: 'order1',
          symbol,
          side: TradeSide.BUY,
          amount: 0.1,
          price: 45000,
          status: TradeStatus.FILLED,
          position: null
        },
        {
          id: 'exec2',
          orderId: 'order2',
          symbol,
          side: TradeSide.SELL,
          amount: 0.1,
          price: 46000,
          status: TradeStatus.FILLED,
          position: null
        }
      ];

      mockPrisma.tradeExecution.findMany = vi.fn().mockResolvedValue(executions);

      const result = await repository.findBySymbol(symbol);

      expect(mockPrisma.tradeExecution.findMany).toHaveBeenCalledWith({
        where: {
          symbol
        },
        include: {
          position: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(result).toEqual(executions);
    });

    it('should find trade executions by symbol and status', async () => {
      const symbol = 'BTC/USDT';
      const status = TradeStatus.PENDING;

      mockPrisma.tradeExecution.findMany = vi.fn().mockResolvedValue([]);

      await repository.findBySymbol(symbol, status);

      expect(mockPrisma.tradeExecution.findMany).toHaveBeenCalledWith({
        where: {
          symbol,
          status
        },
        include: {
          position: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });
  });

  describe('findPending', () => {
    it('should find pending trade executions', async () => {
      const pendingExecutions = [
        {
          id: 'exec1',
          orderId: 'order1',
          symbol: 'BTC/USDT',
          side: TradeSide.BUY,
          amount: 0.1,
          price: 45000,
          status: TradeStatus.PENDING,
          position: null
        }
      ];

      mockPrisma.tradeExecution.findMany = vi.fn().mockResolvedValue(pendingExecutions);

      const result = await repository.findPending();

      expect(mockPrisma.tradeExecution.findMany).toHaveBeenCalledWith({
        where: {
          status: TradeStatus.PENDING
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

  describe('update', () => {
    it('should update trade execution', async () => {
      const executionId = 'exec-123';
      const updateData: UpdateTradeExecutionData = {
        status: TradeStatus.FILLED,
        price: 45500,
        fee: 4.55
      };

      const updatedExecution = {
        id: executionId,
        orderId: 'order-123',
        symbol: 'BTC/USDT',
        side: TradeSide.BUY,
        amount: 0.1,
        price: 45500,
        fee: 4.55,
        status: TradeStatus.FILLED,
        createdAt: new Date(),
        updatedAt: new Date(),
        position: null
      };

      mockPrisma.tradeExecution.update = vi.fn().mockResolvedValue(updatedExecution);

      const result = await repository.update(executionId, updateData);

      expect(mockPrisma.tradeExecution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: updateData,
        include: {
          position: true
        }
      });
      expect(result).toEqual(updatedExecution);
    });
  });

  describe('updateByOrderId', () => {
    it('should update trade execution by order ID', async () => {
      const orderId = 'order-123';
      const updateData: UpdateTradeExecutionData = {
        status: TradeStatus.FILLED
      };

      const updatedExecution = {
        id: 'exec-123',
        orderId,
        symbol: 'BTC/USDT',
        side: TradeSide.BUY,
        amount: 0.1,
        price: 45000,
        status: TradeStatus.FILLED,
        position: null
      };

      mockPrisma.tradeExecution.update = vi.fn().mockResolvedValue(updatedExecution);

      const result = await repository.updateByOrderId(orderId, updateData);

      expect(mockPrisma.tradeExecution.update).toHaveBeenCalledWith({
        where: { orderId },
        data: updateData,
        include: {
          position: true
        }
      });
      expect(result).toEqual(updatedExecution);
    });
  });

  describe('getTradeStats', () => {
    it('should get trade statistics for a symbol', async () => {
      const symbol = 'BTC/USDT';
      const mockAggregateResult = {
        _count: { id: 10 },
        _sum: { amount: 1.0, fee: 45.0 },
        _avg: { price: 45000 }
      };

      mockPrisma.tradeExecution.aggregate = vi.fn().mockResolvedValue(mockAggregateResult);
      mockPrisma.tradeExecution.count = vi.fn()
        .mockResolvedValueOnce(6) // buy trades
        .mockResolvedValueOnce(4); // sell trades

      const result = await repository.getTradeStats(symbol);

      expect(mockPrisma.tradeExecution.aggregate).toHaveBeenCalledWith({
        where: {
          symbol,
          status: TradeStatus.FILLED
        },
        _count: { id: true },
        _sum: { amount: true, fee: true },
        _avg: { price: true }
      });

      expect(result).toEqual({
        totalTrades: 10,
        totalVolume: 1.0,
        totalFees: 45.0,
        averagePrice: 45000,
        buyTrades: 6,
        sellTrades: 4
      });
    });

    it('should handle null aggregate results', async () => {
      const symbol = 'BTC/USDT';
      const mockAggregateResult = {
        _count: { id: 0 },
        _sum: { amount: null, fee: null },
        _avg: { price: null }
      };

      mockPrisma.tradeExecution.aggregate = vi.fn().mockResolvedValue(mockAggregateResult);
      mockPrisma.tradeExecution.count = vi.fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await repository.getTradeStats(symbol);

      expect(result).toEqual({
        totalTrades: 0,
        totalVolume: 0,
        totalFees: 0,
        averagePrice: 0,
        buyTrades: 0,
        sellTrades: 0
      });
    });
  });

  describe('findWithPagination', () => {
    it('should find trade executions with pagination', async () => {
      const executions = [
        {
          id: 'exec1',
          orderId: 'order1',
          symbol: 'BTC/USDT',
          side: TradeSide.BUY,
          amount: 0.1,
          price: 45000,
          status: TradeStatus.FILLED,
          position: null
        }
      ];

      mockPrisma.tradeExecution.findMany = vi.fn().mockResolvedValue(executions);
      mockPrisma.tradeExecution.count = vi.fn().mockResolvedValue(1);

      const result = await repository.findWithPagination(1, 10, 'BTC/USDT', TradeStatus.FILLED);

      expect(mockPrisma.tradeExecution.findMany).toHaveBeenCalledWith({
        where: {
          symbol: 'BTC/USDT',
          status: TradeStatus.FILLED
        },
        include: {
          position: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: 0,
        take: 10
      });
      expect(mockPrisma.tradeExecution.count).toHaveBeenCalledWith({
        where: {
          symbol: 'BTC/USDT',
          status: TradeStatus.FILLED
        }
      });
      expect(result).toEqual({ executions, total: 1 });
    });
  });

  describe('delete', () => {
    it('should delete trade execution', async () => {
      const executionId = 'exec-123';

      mockPrisma.tradeExecution.delete = vi.fn().mockResolvedValue({});

      await repository.delete(executionId);

      expect(mockPrisma.tradeExecution.delete).toHaveBeenCalledWith({
        where: { id: executionId }
      });
    });
  });
});