import { PrismaClient, TradingSignal, SignalAction } from '@prisma/client';
import { BaseRepository } from './base-repository';

export interface CreateTradingSignalData {
  symbol: string;
  action: SignalAction;
  confidence: number;
  targetPrice?: number;
  stopLoss?: number;
  reasoning?: string;
}

export class TradingSignalRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Create a new trading signal
   */
  async create(data: CreateTradingSignalData): Promise<TradingSignal> {
    return this.executeWithErrorHandling(
      () => this.prisma.tradingSignal.create({
        data
      }),
      'create trading signal'
    );
  }

  /**
   * Find trading signal by ID
   */
  async findById(id: string): Promise<TradingSignal | null> {
    return this.executeWithErrorHandling(
      () => this.prisma.tradingSignal.findUnique({
        where: { id }
      }),
      'find trading signal by ID'
    );
  }

  /**
   * Find trading signals by symbol
   */
  async findBySymbol(symbol: string, action?: SignalAction): Promise<TradingSignal[]> {
    return this.executeWithErrorHandling(
      () => this.prisma.tradingSignal.findMany({
        where: {
          symbol,
          ...(action && { action })
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      'find trading signals by symbol'
    );
  }

  /**
   * Find recent trading signals
   */
  async findRecent(limit: number = 10, symbol?: string): Promise<TradingSignal[]> {
    return this.executeWithErrorHandling(
      () => this.prisma.tradingSignal.findMany({
        where: {
          ...(symbol && { symbol })
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      }),
      'find recent trading signals'
    );
  }

  /**
   * Find trading signals by action
   */
  async findByAction(action: SignalAction, symbol?: string): Promise<TradingSignal[]> {
    return this.executeWithErrorHandling(
      () => this.prisma.tradingSignal.findMany({
        where: {
          action,
          ...(symbol && { symbol })
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      'find trading signals by action'
    );
  }

  /**
   * Find trading signals within date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    symbol?: string,
    action?: SignalAction
  ): Promise<TradingSignal[]> {
    return this.executeWithErrorHandling(
      () => this.prisma.tradingSignal.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          ...(symbol && { symbol }),
          ...(action && { action })
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      'find trading signals by date range'
    );
  }

  /**
   * Delete trading signal
   */
  async delete(id: string): Promise<void> {
    await this.executeWithErrorHandling(
      () => this.prisma.tradingSignal.delete({
        where: { id }
      }),
      'delete trading signal'
    );
  }

  /**
   * Get trading signals with pagination
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    symbol?: string,
    action?: SignalAction
  ): Promise<{ signals: TradingSignal[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = {
      ...(symbol && { symbol }),
      ...(action && { action })
    };

    const [signals, total] = await Promise.all([
      this.executeWithErrorHandling(
        () => this.prisma.tradingSignal.findMany({
          where,
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        'find trading signals with pagination'
      ),
      this.executeWithErrorHandling(
        () => this.prisma.tradingSignal.count({ where }),
        'count trading signals'
      )
    ]);

    return { signals, total };
  }

  /**
   * Get signal statistics
   */
  async getSignalStats(symbol?: string, startDate?: Date, endDate?: Date) {
    const where = {
      ...(symbol && { symbol }),
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      })
    };

    return this.executeWithErrorHandling(
      async () => {
        const stats = await this.prisma.tradingSignal.aggregate({
          where,
          _count: {
            id: true
          },
          _avg: {
            confidence: true
          }
        });

        const buySignals = await this.prisma.tradingSignal.count({
          where: { ...where, action: 'BUY' }
        });

        const sellSignals = await this.prisma.tradingSignal.count({
          where: { ...where, action: 'SELL' }
        });

        const holdSignals = await this.prisma.tradingSignal.count({
          where: { ...where, action: 'HOLD' }
        });

        return {
          totalSignals: stats._count.id,
          averageConfidence: stats._avg.confidence || 0,
          buySignals,
          sellSignals,
          holdSignals
        };
      },
      'get signal statistics'
    );
  }

  /**
   * Clean up old signals (older than specified days)
   */
  async cleanupOldSignals(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return this.executeWithErrorHandling(
      async () => {
        const result = await this.prisma.tradingSignal.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate
            }
          }
        });
        return result.count;
      },
      'cleanup old trading signals'
    );
  }
}