import { PrismaClient } from '@prisma/client';
import { BaseRepository } from './base-repository';

// Type imports - these will be available after Prisma generation
type TradingPosition = any;
type PositionSide = 'BUY' | 'SELL';
type PositionStatus = 'OPEN' | 'CLOSED';

export interface CreateTradingPositionData {
  symbol: string;
  side: PositionSide;
  amount: number;
  entryPrice: number;
  currentPrice?: number;
  unrealizedPnL?: number;
}

export interface UpdateTradingPositionData {
  currentPrice?: number;
  unrealizedPnL?: number;
  status?: PositionStatus;
}

export class TradingPositionRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Create a new trading position
   */
  async create(data: CreateTradingPositionData): Promise<TradingPosition> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradingPosition.create({
        data,
        include: {
          tradeExecutions: true
        }
      }),
      'create trading position'
    );
  }

  /**
   * Find position by ID
   */
  async findById(id: string): Promise<TradingPosition | null> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradingPosition.findUnique({
        where: { id },
        include: {
          tradeExecutions: true
        }
      }),
      'find position by ID'
    );
  }

  /**
   * Find all open positions
   */
  async findOpenPositions(): Promise<TradingPosition[]> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradingPosition.findMany({
        where: {
          status: 'OPEN'
        },
        include: {
          tradeExecutions: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      'find open positions'
    );
  }

  /**
   * Find positions by symbol
   */
  async findBySymbol(symbol: string, status?: PositionStatus): Promise<TradingPosition[]> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradingPosition.findMany({
        where: {
          symbol,
          ...(status && { status })
        },
        include: {
          tradeExecutions: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      'find positions by symbol'
    );
  }

  /**
   * Update position
   */
  async update(id: string, data: UpdateTradingPositionData): Promise<TradingPosition> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradingPosition.update({
        where: { id },
        data,
        include: {
          tradeExecutions: true
        }
      }),
      'update trading position'
    );
  }

  /**
   * Close position
   */
  async closePosition(id: string): Promise<TradingPosition> {
    return this.executeWithErrorHandling(
      () => (this.prisma as any).tradingPosition.update({
        where: { id },
        data: {
          status: 'CLOSED'
        },
        include: {
          tradeExecutions: true
        }
      }),
      'close trading position'
    );
  }

  /**
   * Delete position
   */
  async delete(id: string): Promise<void> {
    await this.executeWithErrorHandling(
      () => (this.prisma as any).tradingPosition.delete({
        where: { id }
      }),
      'delete trading position'
    );
  }

  /**
   * Get positions with pagination
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    symbol?: string,
    status?: PositionStatus
  ): Promise<{ positions: TradingPosition[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = {
      ...(symbol && { symbol }),
      ...(status && { status })
    };

    const [positions, total] = await Promise.all([
      this.executeWithErrorHandling(
        () => (this.prisma as any).tradingPosition.findMany({
          where,
          include: {
            tradeExecutions: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        'find positions with pagination'
      ),
      this.executeWithErrorHandling(
        () => (this.prisma as any).tradingPosition.count({ where }),
        'count positions'
      )
    ]);

    return { positions: positions as any[], total: total as number };
  }
}