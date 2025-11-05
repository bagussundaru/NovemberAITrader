import { PrismaClient } from '@prisma/client';
import {
  TradingPositionRepository,
  TradeExecutionRepository,
  TradingSignalRepository,
  MarketDataRepository
} from '../repositories';

export class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;
  
  // Repository instances
  public readonly tradingPositions: TradingPositionRepository;
  public readonly tradeExecutions: TradeExecutionRepository;
  public readonly tradingSignals: TradingSignalRepository;
  public readonly marketData: MarketDataRepository;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });

    // Initialize repositories
    this.tradingPositions = new TradingPositionRepository(this.prisma);
    this.tradeExecutions = new TradeExecutionRepository(this.prisma);
    this.tradingSignals = new TradingSignalRepository(this.prisma);
    this.marketData = new MarketDataRepository(this.prisma);
  }

  /**
   * Get singleton instance of DatabaseService
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Get direct access to Prisma client for complex queries
   */
  public getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('Database disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  /**
   * Check database health
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<void> {
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      throw new Error('Database connection test failed');
    }
  }

  /**
   * Store market data
   */
  public async storeMarketData(marketData: any): Promise<void> {
    await this.marketData.create({
      symbol: marketData.symbol,
      timestamp: new Date(marketData.timestamp),
      price: marketData.price,
      volume: marketData.volume,
      orderBook: marketData.orderBook,
      rsi: marketData.indicators?.rsi,
      macd: marketData.indicators?.macd,
      movingAverage: marketData.indicators?.movingAverage
    });
  }

  /**
   * Store trading signal
   */
  public async storeTradingSignal(signal: any): Promise<void> {
    await this.tradingSignals.create({
      symbol: signal.symbol,
      action: signal.action,
      confidence: signal.confidence,
      targetPrice: signal.targetPrice,
      stopLoss: signal.stopLoss,
      reasoning: signal.reasoning
    });
  }

  /**
   * Store trading position
   */
  public async storeTradingPosition(position: any): Promise<void> {
    await this.tradingPositions.create({
      symbol: position.symbol,
      side: position.side,
      amount: position.amount,
      entryPrice: position.entryPrice,
      currentPrice: position.currentPrice,
      unrealizedPnL: position.unrealizedPnL
    });
  }

  /**
   * Get active trading positions
   */
  public async getActiveTradingPositions(): Promise<any[]> {
    return await this.tradingPositions.findOpenPositions();
  }

  /**
   * Get recent trading signals
   */
  public async getRecentTradingSignals(limit: number): Promise<any[]> {
    return await this.tradingSignals.findRecent(limit);
  }

  /**
   * Execute database transaction
   */
  public async transaction<T>(
    callback: (tx: any) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      return await callback(tx);
    });
  }

  /**
   * Clean up old data across all tables
   */
  public async cleanupOldData(daysToKeep: number = 30): Promise<{
    marketDataDeleted: number;
    signalsDeleted: number;
  }> {
    try {
      const [marketDataDeleted, signalsDeleted] = await Promise.all([
        this.marketData.cleanupOldData(daysToKeep),
        this.tradingSignals.cleanupOldSignals(daysToKeep)
      ]);

      console.log(`Cleanup completed: ${marketDataDeleted} market data entries and ${signalsDeleted} signals deleted`);
      
      return {
        marketDataDeleted,
        signalsDeleted
      };
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<{
    openPositions: number;
    totalTrades: number;
    pendingTrades: number;
    recentSignals: number;
    marketDataPoints: number;
  }> {
    try {
      const [
        openPositions,
        totalTrades,
        pendingTrades,
        recentSignals,
        marketDataPoints
      ] = await Promise.all([
        this.prisma.tradingPosition.count({
          where: { status: 'OPEN' }
        }),
        this.prisma.tradeExecution.count(),
        this.prisma.tradeExecution.count({
          where: { status: 'PENDING' }
        }),
        this.prisma.tradingSignal.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        }),
        this.prisma.marketData.count()
      ]);

      return {
        openPositions,
        totalTrades,
        pendingTrades,
        recentSignals,
        marketDataPoints
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Seed database with initial data (for development/testing)
   */
  public async seedDatabase(): Promise<void> {
    try {
      console.log('Seeding database with initial data...');
      
      // Add any initial data seeding logic here
      // For example, default trading pairs, initial configurations, etc.
      
      console.log('Database seeding completed');
    } catch (error) {
      console.error('Failed to seed database:', error);
      throw error;
    }
  }

  /**
   * Reset database (for testing purposes)
   */
  public async resetDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production');
    }

    try {
      console.log('Resetting database...');
      
      // Delete all data in reverse order of dependencies
      await this.prisma.tradeExecution.deleteMany();
      await this.prisma.tradingPosition.deleteMany();
      await this.prisma.tradingSignal.deleteMany();
      await this.prisma.marketData.deleteMany();
      
      console.log('Database reset completed');
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }
}