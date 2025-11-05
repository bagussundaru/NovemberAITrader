import { PrismaClient, MarketData } from '@prisma/client';
import { BaseRepository } from './base-repository';

export interface CreateMarketDataData {
  symbol: string;
  price: number;
  volume: number;
  orderBook?: any; // JSON data
  rsi?: number;
  macd?: number;
  movingAverage?: number;
  timestamp: Date;
}

export interface UpdateMarketDataData {
  price?: number;
  volume?: number;
  orderBook?: any;
  rsi?: number;
  macd?: number;
  movingAverage?: number;
}

export class MarketDataRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Create new market data entry
   */
  async create(data: CreateMarketDataData): Promise<MarketData> {
    return this.executeWithErrorHandling(
      () => this.prisma.marketData.create({
        data
      }),
      'create market data'
    );
  }

  /**
   * Find market data by ID
   */
  async findById(id: string): Promise<MarketData | null> {
    return this.executeWithErrorHandling(
      () => this.prisma.marketData.findUnique({
        where: { id }
      }),
      'find market data by ID'
    );
  }

  /**
   * Find latest market data for symbol
   */
  async findLatestBySymbol(symbol: string): Promise<MarketData | null> {
    return this.executeWithErrorHandling(
      () => this.prisma.marketData.findFirst({
        where: { symbol },
        orderBy: {
          timestamp: 'desc'
        }
      }),
      'find latest market data by symbol'
    );
  }

  /**
   * Find market data by symbol within time range
   */
  async findBySymbolAndTimeRange(
    symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<MarketData[]> {
    return this.executeWithErrorHandling(
      () => this.prisma.marketData.findMany({
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
      }),
      'find market data by symbol and time range'
    );
  }

  /**
   * Find recent market data for symbol
   */
  async findRecentBySymbol(symbol: string, limit: number = 100): Promise<MarketData[]> {
    return this.executeWithErrorHandling(
      () => this.prisma.marketData.findMany({
        where: { symbol },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      }),
      'find recent market data by symbol'
    );
  }

  /**
   * Find market data with technical indicators
   */
  async findWithIndicators(
    symbol: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<MarketData[]> {
    const where = {
      symbol,
      OR: [
        { rsi: { not: null } },
        { macd: { not: null } },
        { movingAverage: { not: null } }
      ],
      ...(startTime && endTime && {
        timestamp: {
          gte: startTime,
          lte: endTime
        }
      })
    };

    return this.executeWithErrorHandling(
      () => this.prisma.marketData.findMany({
        where,
        orderBy: {
          timestamp: 'desc'
        }
      }),
      'find market data with indicators'
    );
  }

  /**
   * Update market data
   */
  async update(id: string, data: UpdateMarketDataData): Promise<MarketData> {
    return this.executeWithErrorHandling(
      () => this.prisma.marketData.update({
        where: { id },
        data
      }),
      'update market data'
    );
  }

  /**
   * Delete market data
   */
  async delete(id: string): Promise<void> {
    await this.executeWithErrorHandling(
      () => this.prisma.marketData.delete({
        where: { id }
      }),
      'delete market data'
    );
  }

  /**
   * Get market data with pagination
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    symbol?: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<{ data: MarketData[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = {
      ...(symbol && { symbol }),
      ...(startTime && endTime && {
        timestamp: {
          gte: startTime,
          lte: endTime
        }
      })
    };

    const [data, total] = await Promise.all([
      this.executeWithErrorHandling(
        () => this.prisma.marketData.findMany({
          where,
          orderBy: {
            timestamp: 'desc'
          },
          skip,
          take: limit
        }),
        'find market data with pagination'
      ),
      this.executeWithErrorHandling(
        () => this.prisma.marketData.count({ where }),
        'count market data'
      )
    ]);

    return { data, total };
  }

  /**
   * Get price statistics for symbol
   */
  async getPriceStats(symbol: string, startTime?: Date, endTime?: Date) {
    const where = {
      symbol,
      ...(startTime && endTime && {
        timestamp: {
          gte: startTime,
          lte: endTime
        }
      })
    };

    return this.executeWithErrorHandling(
      async () => {
        const stats = await this.prisma.marketData.aggregate({
          where,
          _count: {
            id: true
          },
          _avg: {
            price: true,
            volume: true
          },
          _min: {
            price: true
          },
          _max: {
            price: true
          }
        });

        return {
          count: stats._count.id,
          averagePrice: stats._avg.price || 0,
          averageVolume: stats._avg.volume || 0,
          minPrice: stats._min.price || 0,
          maxPrice: stats._max.price || 0
        };
      },
      'get price statistics'
    );
  }

  /**
   * Clean up old market data (older than specified days)
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return this.executeWithErrorHandling(
      async () => {
        const result = await this.prisma.marketData.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate
            }
          }
        });
        return result.count;
      },
      'cleanup old market data'
    );
  }

  /**
   * Bulk insert market data for better performance
   */
  async bulkCreate(dataArray: CreateMarketDataData[]): Promise<number> {
    return this.executeWithErrorHandling(
      async () => {
        const result = await this.prisma.marketData.createMany({
          data: dataArray,
          skipDuplicates: true
        });
        return result.count;
      },
      'bulk create market data'
    );
  }

  /**
   * Get OHLCV data for charting
   */
  async getOHLCVData(
    symbol: string,
    startTime: Date,
    endTime: Date,
    intervalMinutes: number = 5
  ) {
    return this.executeWithErrorHandling(
      async () => {
        // This is a simplified version - in production you might want to use raw SQL
        // for better performance with time-based aggregations
        const data = await this.prisma.marketData.findMany({
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

        // Group data by time intervals and calculate OHLCV
        const intervals = new Map();
        
        data.forEach(item => {
          const intervalStart = new Date(
            Math.floor(item.timestamp.getTime() / (intervalMinutes * 60 * 1000)) * 
            (intervalMinutes * 60 * 1000)
          );
          const key = intervalStart.getTime();
          
          if (!intervals.has(key)) {
            intervals.set(key, {
              timestamp: intervalStart,
              open: item.price,
              high: item.price,
              low: item.price,
              close: item.price,
              volume: item.volume
            });
          } else {
            const interval = intervals.get(key);
            interval.high = Math.max(interval.high, item.price);
            interval.low = Math.min(interval.low, item.price);
            interval.close = item.price;
            interval.volume += item.volume;
          }
        });

        return Array.from(intervals.values()).sort((a, b) => 
          a.timestamp.getTime() - b.timestamp.getTime()
        );
      },
      'get OHLCV data'
    );
  }
}