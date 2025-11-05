import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../database-service';

// Mock Prisma Client
const mockPrisma = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  tradingPosition: {
    count: vi.fn(),
    deleteMany: vi.fn()
  },
  tradeExecution: {
    count: vi.fn(),
    deleteMany: vi.fn()
  },
  tradingSignal: {
    count: vi.fn(),
    deleteMany: vi.fn()
  },
  marketData: {
    count: vi.fn(),
    deleteMany: vi.fn()
  }
} as any;

// Mock the repositories
vi.mock('../repositories', () => ({
  TradingPositionRepository: vi.fn().mockImplementation(() => ({
    cleanupOldData: vi.fn().mockResolvedValue(10)
  })),
  TradeExecutionRepository: vi.fn().mockImplementation(() => ({})),
  TradingSignalRepository: vi.fn().mockImplementation(() => ({
    cleanupOldSignals: vi.fn().mockResolvedValue(5)
  })),
  MarketDataRepository: vi.fn().mockImplementation(() => ({
    cleanupOldData: vi.fn().mockResolvedValue(100)
  }))
}));

// Mock PrismaClient constructor
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma)
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    (DatabaseService as any).instance = undefined;
    databaseService = DatabaseService.getInstance();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DatabaseService);
    });
  });

  describe('connect', () => {
    it('should connect to database successfully', async () => {
      mockPrisma.$connect = vi.fn().mockResolvedValue(undefined);

      await databaseService.connect();

      expect(mockPrisma.$connect).toHaveBeenCalledOnce();
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockPrisma.$connect = vi.fn().mockRejectedValue(connectionError);

      await expect(databaseService.connect()).rejects.toThrow('Connection failed');
      expect(mockPrisma.$connect).toHaveBeenCalledOnce();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from database successfully', async () => {
      mockPrisma.$disconnect = vi.fn().mockResolvedValue(undefined);

      await databaseService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalledOnce();
    });

    it('should handle disconnection errors', async () => {
      const disconnectionError = new Error('Disconnection failed');
      mockPrisma.$disconnect = vi.fn().mockRejectedValue(disconnectionError);

      await expect(databaseService.disconnect()).rejects.toThrow('Disconnection failed');
      expect(mockPrisma.$disconnect).toHaveBeenCalledOnce();
    });
  });

  describe('healthCheck', () => {
    it('should return true when database is healthy', async () => {
      mockPrisma.$queryRaw = vi.fn().mockResolvedValue([{ '?column?': 1 }]);

      const result = await databaseService.healthCheck();

      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(['SELECT 1']);
    });

    it('should return false when database is unhealthy', async () => {
      mockPrisma.$queryRaw = vi.fn().mockRejectedValue(new Error('Database error'));

      const result = await databaseService.healthCheck();

      expect(result).toBe(false);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(['SELECT 1']);
    });
  });

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      const mockCallback = vi.fn().mockResolvedValue('transaction result');
      mockPrisma.$transaction = vi.fn().mockImplementation((callback) => callback(mockPrisma));

      const result = await databaseService.transaction(mockCallback);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(mockPrisma);
      expect(result).toBe('transaction result');
    });

    it('should handle transaction errors', async () => {
      const mockCallback = vi.fn().mockRejectedValue(new Error('Transaction failed'));
      mockPrisma.$transaction = vi.fn().mockImplementation((callback) => callback(mockPrisma));

      await expect(databaseService.transaction(mockCallback)).rejects.toThrow('Transaction failed');
    });
  });

  describe('cleanupOldData', () => {
    it('should cleanup old data successfully', async () => {
      // Mock the repository methods through the service instance
      databaseService.marketData.cleanupOldData = vi.fn().mockResolvedValue(100);
      databaseService.tradingSignals.cleanupOldSignals = vi.fn().mockResolvedValue(5);

      const result = await databaseService.cleanupOldData(30);

      expect(databaseService.marketData.cleanupOldData).toHaveBeenCalledWith(30);
      expect(databaseService.tradingSignals.cleanupOldSignals).toHaveBeenCalledWith(30);
      expect(result).toEqual({
        marketDataDeleted: 100,
        signalsDeleted: 5
      });
    });

    it('should handle cleanup errors', async () => {
      databaseService.marketData.cleanupOldData = vi.fn().mockRejectedValue(new Error('Cleanup failed'));

      await expect(databaseService.cleanupOldData(30)).rejects.toThrow('Cleanup failed');
    });
  });

  describe('getStats', () => {
    it('should get database statistics successfully', async () => {
      mockPrisma.tradingPosition.count = vi.fn()
        .mockResolvedValueOnce(5); // open positions
      mockPrisma.tradeExecution.count = vi.fn()
        .mockResolvedValueOnce(100) // total trades
        .mockResolvedValueOnce(3); // pending trades
      mockPrisma.tradingSignal.count = vi.fn()
        .mockResolvedValueOnce(20); // recent signals
      mockPrisma.marketData.count = vi.fn()
        .mockResolvedValueOnce(1000); // market data points

      const result = await databaseService.getStats();

      expect(result).toEqual({
        openPositions: 5,
        totalTrades: 100,
        pendingTrades: 3,
        recentSignals: 20,
        marketDataPoints: 1000
      });

      expect(mockPrisma.tradingPosition.count).toHaveBeenCalledWith({
        where: { status: 'OPEN' }
      });
      expect(mockPrisma.tradeExecution.count).toHaveBeenCalledTimes(2);
      expect(mockPrisma.tradingSignal.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date)
          }
        }
      });
      expect(mockPrisma.marketData.count).toHaveBeenCalledOnce();
    });

    it('should handle stats errors', async () => {
      mockPrisma.tradingPosition.count = vi.fn().mockRejectedValue(new Error('Stats failed'));

      await expect(databaseService.getStats()).rejects.toThrow('Stats failed');
    });
  });

  describe('resetDatabase', () => {
    it('should reset database in non-production environment', async () => {
      vi.stubEnv('NODE_ENV', 'test');

      mockPrisma.tradeExecution.deleteMany = vi.fn().mockResolvedValue({ count: 10 });
      mockPrisma.tradingPosition.deleteMany = vi.fn().mockResolvedValue({ count: 5 });
      mockPrisma.tradingSignal.deleteMany = vi.fn().mockResolvedValue({ count: 20 });
      mockPrisma.marketData.deleteMany = vi.fn().mockResolvedValue({ count: 100 });

      await databaseService.resetDatabase();

      expect(mockPrisma.tradeExecution.deleteMany).toHaveBeenCalledOnce();
      expect(mockPrisma.tradingPosition.deleteMany).toHaveBeenCalledOnce();
      expect(mockPrisma.tradingSignal.deleteMany).toHaveBeenCalledOnce();
      expect(mockPrisma.marketData.deleteMany).toHaveBeenCalledOnce();

      vi.unstubAllEnvs();
    });

    it('should throw error in production environment', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      await expect(databaseService.resetDatabase()).rejects.toThrow(
        'Database reset is not allowed in production'
      );

      vi.unstubAllEnvs();
    });

    it('should handle reset errors', async () => {
      vi.stubEnv('NODE_ENV', 'test');

      mockPrisma.tradeExecution.deleteMany = vi.fn().mockRejectedValue(new Error('Reset failed'));

      await expect(databaseService.resetDatabase()).rejects.toThrow('Reset failed');

      vi.unstubAllEnvs();
    });
  });

  describe('getPrismaClient', () => {
    it('should return Prisma client instance', () => {
      const client = databaseService.getPrismaClient();

      expect(client).toBe(mockPrisma);
    });
  });

  describe('repository access', () => {
    it('should provide access to all repositories', () => {
      expect(databaseService.tradingPositions).toBeDefined();
      expect(databaseService.tradeExecutions).toBeDefined();
      expect(databaseService.tradingSignals).toBeDefined();
      expect(databaseService.marketData).toBeDefined();
    });
  });
});