import { PrismaClient } from '@prisma/client';

// Type imports - these will be available after Prisma generation
type TradeExecution = any;
type TradeSide = 'BUY' | 'SELL';
type TradeStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED';
import { BaseRepository } from './base-repository';

export interface CreateTradeExecutionData {
  orderId: string;
  symbol: string;
  side: TradeSide;
  amount: number;
  price: number;
  fee?: number;
  status?: TradeStatus;
  positionId?: string;
}

export interface UpdateTradeExecutionData {
  status?: TradeStatus;
  price?: number;
  fee?: number;
}

export class TradeExecutionRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Create a new trade execution
   */
  async create(data: CreateTradeExecutionData): Promise<TradeExecution> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradeExecution.create({
        data,
        include: {
          position: true
        }
      }),
      'create trade execution'
    );
  }

  /**
   * Find trade execution by ID
   */
  async findById(id: string): Promise<TradeExecution | null> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradeExecution.findUnique({
        where: { id },
        include: {
          position: true
        }
      }),
      'find trade execution by ID'
    );
  }

  /**
   * Find trade execution by order ID
   */
  async findByOrderId(orderId: string): Promise<TradeExecution | null> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradeExecution.findUnique({
        where: { orderId },
        include: {
          position: true
        }
      }),
      'find trade execution by order ID'
    );
  }

  /**
   * Find trade executions by symbol
   */
  async findBySymbol(symbol: string, status?: TradeStatus): Promise<TradeExecution[]> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradeExecution.findMany({
        where: {
          symbol,
          ...(status && { status })
        },
        include: {
          position: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      'find trade executions by symbol'
    );
  }

  /**
   * Find trade executions by position ID
   */
  async findByPositionId(positionId: string): Promise<TradeExecution[]> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradeExecution.findMany({
        where: { positionId },
        include: {
          position: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      'find trade executions by position ID'
    );
  }

  /**
   * Find pending trade executions
   */
  async findPending(): Promise<TradeExecution[]> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradeExecution.findMany({
        where: {
          status: 'PENDING'
        },
        include: {
          position: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }),
      'find pending trade executions'
    );
  }

  /**
   * Update trade execution
   */
  async update(id: string, data: UpdateTradeExecutionData): Promise<TradeExecution> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradeExecution.update({
        where: { id },
        data,
        include: {
          position: true
        }
      }),
      'update trade execution'
    );
  }

  /**
   * Update trade execution by order ID
   */
  async updateByOrderId(orderId: string, data: UpdateTradeExecutionData): Promise<TradeExecution> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradeExecution.update({
        where: { orderId },
        data,
        include: {
          position: true
        }
      }),
      'update trade execution by order ID'
    );
  }

  /**
   * Delete trade execution
   */
  async delete(id: string): Promise<void> {
    await this.executeWithErrorHandling(
      () => (this.prisma as any).tradeExecution.delete({
        where: { id }
      }),
      'delete trade execution'
    );
  }

  /**
   * Get trade executions with pagination
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    symbol?: string,
    status?: TradeStatus
  ): Promise<{ executions: TradeExecution[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = {
      ...(symbol && { symbol }),
      ...(status && { status })
    };

    const [executions, total] = await Promise.all([
      this.executeWithErrorHandling(
        () => (this.prisma as any).tradeExecution.findMany({
          where,
          include: {
            position: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        'find trade executions with pagination'
      ),
      this.executeWithErrorHandling(
        () => (this.prisma as any).tradeExecution.count({ where }),
        'count trade executions'
      )
    ]);

    return { executions: executions as any[], total: total as number };
  }

  /**
   * Get trade statistics for a symbol
   */
  async getTradeStats(symbol: string, startDate?: Date, endDate?: Date) {
    const where = {
      symbol,
      status: 'FILLED',
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      })
    };

    return this.executeWithErrorHandling(
      async () => {
        const stats = await (this.prisma as any).tradeExecution.aggregate({
          where,
          _count: {
            id: true
          },
          _sum: {
            amount: true,
            fee: true
          },
          _avg: {
            price: true
          }
        });

        const buyTrades = await (this.prisma as any).tradeExecution.count({
          where: { ...where, side: 'BUY' }
        });

        const sellTrades = await (this.prisma as any).tradeExecution.count({
          where: { ...where, side: 'SELL' }
        });

        return {
          totalTrades: stats._count.id,
          totalVolume: stats._sum.amount || 0,
          totalFees: stats._sum.fee || 0,
          averagePrice: stats._avg.price || 0,
          buyTrades,
          sellTrades
        };
      },
      'get trade statistics'
    );
  }
}