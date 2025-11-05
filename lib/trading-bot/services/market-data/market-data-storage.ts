// Market Data Storage Service
// Implements historical market data storage and retrieval

import { PrismaClient } from '@prisma/client';
import { MarketData, TechnicalIndicators, OrderBook } from '../../types';

interface StoredMarketData {
  id: string;
  symbol: string;
  timestamp: Date;
  price: number;
  volume: number;
  orderBookBids: string; // JSON string
  orderBookAsks: string; // JSON string
  rsi: number;
  macd: number;
  movingAverage: number;
  createdAt: Date;
}

interface MarketDataQuery {
  symbol?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  orderBy?: 'timestamp' | 'price' | 'volume';
  orderDirection?: 'asc' | 'desc';
}

interface MarketDataAggregation {
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export class MarketDataStorage {
  private prisma: PrismaClient;
  private maxStorageSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(prisma: PrismaClient, options?: { maxStorageSize?: number; enableAutoCleanup?: boolean }) {
    this.prisma = prisma;
    this.maxStorageSize = options?.maxStorageSize || 100000; // Default 100k records per symbol
    
    if (options?.enableAutoCleanup !== false) {
      this.startAutoCleanup();
    }
  }

  /**
   * Store market data in the database
   */
  async storeMarketData(data: MarketData): Promise<void> {
    try {
      // Since we don't have a dedicated MarketData table in the current schema,
      // we'll use the existing Metrics table to store market data as JSON
      await this.prisma.metrics.create({
        data: {
          name: `market_data_${data.symbol}`,
          model: 'Deepseek', // Using existing enum value
          metrics: [
            {
              symbol: data.symbol,
              timestamp: data.timestamp,
              price: data.price,
              volume: data.volume,
              orderBook: {
                bids: data.orderBook.bids.map(bid => ({ price: bid.price, amount: bid.amount })),
                asks: data.orderBook.asks.map(ask => ({ price: ask.price, amount: ask.amount }))
              },
              indicators: {
                rsi: data.indicators.rsi,
                macd: data.indicators.macd,
                movingAverage: data.indicators.movingAverage
              }
            }
          ] as any // Type assertion to handle Prisma JSON compatibility
        }
      });
    } catch (error) {
      console.error(`Failed to store market data for ${data.symbol}:`, error);
      throw error;
    }
  }

  /**
   * Store multiple market data points in batch for better performance
   */
  async batchStoreMarketData(dataPoints: MarketData[]): Promise<void> {
    if (dataPoints.length === 0) return;

    try {
      const batchData = dataPoints.map(data => ({
        name: `market_data_${data.symbol}`,
        model: 'Deepseek' as const,
        metrics: [
          {
            symbol: data.symbol,
            timestamp: data.timestamp,
            price: data.price,
            volume: data.volume,
            orderBook: {
              bids: data.orderBook.bids.map(bid => ({ price: bid.price, amount: bid.amount })),
              asks: data.orderBook.asks.map(ask => ({ price: ask.price, amount: ask.amount }))
            },
            indicators: {
              rsi: data.indicators.rsi,
              macd: data.indicators.macd,
              movingAverage: data.indicators.movingAverage
            }
          }
        ] as any // Type assertion to handle Prisma JSON compatibility
      }));

      await this.prisma.metrics.createMany({
        data: batchData
      });
    } catch (error) {
      console.error('Failed to batch store market data:', error);
      throw error;
    }
  }

  /**
   * Retrieve historical market data with flexible querying
   */
  async getHistoricalData(query: MarketDataQuery): Promise<MarketData[]> {
    try {
      const whereClause: any = {
        name: {
          startsWith: 'market_data_'
        }
      };

      if (query.symbol) {
        whereClause.name = `market_data_${query.symbol}`;
      }

      if (query.startTime || query.endTime) {
        whereClause.createdAt = {};
        if (query.startTime) {
          whereClause.createdAt.gte = query.startTime;
        }
        if (query.endTime) {
          whereClause.createdAt.lte = query.endTime;
        }
      }

      const orderBy: any = {};
      if (query.orderBy) {
        if (query.orderBy === 'timestamp') {
          orderBy.createdAt = query.orderDirection || 'desc';
        } else {
          // For price and volume ordering, we'd need to order by JSON field
          // This is a limitation of using the Metrics table
          orderBy.createdAt = query.orderDirection || 'desc';
        }
      } else {
        orderBy.createdAt = 'desc';
      }

      const records = await this.prisma.metrics.findMany({
        where: whereClause,
        orderBy,
        take: query.limit || 1000
      });

      // Convert stored records back to MarketData format
      const marketDataList: MarketData[] = [];
      
      for (const record of records) {
        if (Array.isArray(record.metrics) && record.metrics.length > 0) {
          const metricData = record.metrics[0] as any;
          
          // Skip malformed records
          if (!metricData || !metricData.symbol) {
            continue;
          }
          
          marketDataList.push({
            symbol: metricData.symbol,
            timestamp: metricData.timestamp,
            price: metricData.price,
            volume: metricData.volume,
            orderBook: {
              bids: metricData.orderBook?.bids || [],
              asks: metricData.orderBook?.asks || []
            },
            indicators: {
              rsi: metricData.indicators?.rsi || 50,
              macd: metricData.indicators?.macd || 0,
              movingAverage: metricData.indicators?.movingAverage || metricData.price
            }
          });
        }
      }

      return marketDataList;
    } catch (error) {
      console.error('Failed to retrieve historical data:', error);
      throw error;
    }
  }

  /**
   * Get price history for technical analysis
   */
  async getPriceHistory(symbol: string, limit: number = 200): Promise<number[]> {
    const historicalData = await this.getHistoricalData({
      symbol,
      limit,
      orderBy: 'timestamp',
      orderDirection: 'asc'
    });

    return historicalData.map(data => data.price);
  }

  /**
   * Get volume history for analysis
   */
  async getVolumeHistory(symbol: string, limit: number = 200): Promise<number[]> {
    const historicalData = await this.getHistoricalData({
      symbol,
      limit,
      orderBy: 'timestamp',
      orderDirection: 'asc'
    });

    return historicalData.map(data => data.volume);
  }

  /**
   * Calculate aggregated market data (OHLCV) for different timeframes
   */
  async getAggregatedData(
    symbol: string, 
    timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d',
    startTime: Date,
    endTime: Date
  ): Promise<MarketDataAggregation[]> {
    const rawData = await this.getHistoricalData({
      symbol,
      startTime,
      endTime,
      orderBy: 'timestamp',
      orderDirection: 'asc'
    });

    if (rawData.length === 0) {
      return [];
    }

    const timeframeMs = this.getTimeframeMilliseconds(timeframe);
    const aggregations: MarketDataAggregation[] = [];
    
    let currentBucket: MarketData[] = [];
    let bucketStartTime = Math.floor(rawData[0].timestamp / timeframeMs) * timeframeMs;

    for (const data of rawData) {
      const dataBucketTime = Math.floor(data.timestamp / timeframeMs) * timeframeMs;
      
      if (dataBucketTime === bucketStartTime) {
        currentBucket.push(data);
      } else {
        // Process current bucket
        if (currentBucket.length > 0) {
          aggregations.push(this.aggregateBucket(symbol, timeframe, currentBucket, new Date(bucketStartTime)));
        }
        
        // Start new bucket
        currentBucket = [data];
        bucketStartTime = dataBucketTime;
      }
    }

    // Process final bucket
    if (currentBucket.length > 0) {
      aggregations.push(this.aggregateBucket(symbol, timeframe, currentBucket, new Date(bucketStartTime)));
    }

    return aggregations;
  }

  /**
   * Get latest market data for a symbol
   */
  async getLatestMarketData(symbol: string): Promise<MarketData | null> {
    const latest = await this.getHistoricalData({
      symbol,
      limit: 1,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });

    return latest.length > 0 ? latest[0] : null;
  }

  /**
   * Get market data statistics for a symbol
   */
  async getMarketDataStats(symbol: string, days: number = 30): Promise<{
    count: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    totalVolume: number;
    avgVolume: number;
    priceVolatility: number;
  }> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const data = await this.getHistoricalData({
      symbol,
      startTime,
      endTime
    });

    if (data.length === 0) {
      return {
        count: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalVolume: 0,
        avgVolume: 0,
        priceVolatility: 0
      };
    }

    const prices = data.map(d => d.price);
    const volumes = data.map(d => d.volume);
    
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const totalVolume = volumes.reduce((sum, volume) => sum + volume, 0);
    const avgVolume = totalVolume / volumes.length;
    
    // Calculate price volatility (standard deviation)
    const priceVariance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const priceVolatility = Math.sqrt(priceVariance);

    return {
      count: data.length,
      avgPrice: Math.round(avgPrice * 100) / 100,
      minPrice,
      maxPrice,
      totalVolume: Math.round(totalVolume * 100) / 100,
      avgVolume: Math.round(avgVolume * 100) / 100,
      priceVolatility: Math.round(priceVolatility * 100) / 100
    };
  }

  /**
   * Clean up old market data to maintain storage limits
   */
  async cleanupOldData(symbol?: string, keepDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - (keepDays * 24 * 60 * 60 * 1000));
    
    try {
      const whereClause: any = {
        createdAt: {
          lt: cutoffDate
        },
        name: {
          startsWith: 'market_data_'
        }
      };

      if (symbol) {
        whereClause.name = `market_data_${symbol}`;
      }

      const result = await this.prisma.metrics.deleteMany({
        where: whereClause
      });

      console.log(`Cleaned up ${result.count} old market data records`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old market data:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalRecords: number;
    recordsBySymbol: { [symbol: string]: number };
    oldestRecord: Date | null;
    newestRecord: Date | null;
  }> {
    try {
      const totalRecords = await this.prisma.metrics.count({
        where: {
          name: {
            startsWith: 'market_data_'
          }
        }
      });

      const records = await this.prisma.metrics.findMany({
        where: {
          name: {
            startsWith: 'market_data_'
          }
        },
        select: {
          name: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const recordsBySymbol: { [symbol: string]: number } = {};
      let oldestRecord: Date | null = null;
      let newestRecord: Date | null = null;

      for (const record of records) {
        const symbol = record.name.replace('market_data_', '');
        recordsBySymbol[symbol] = (recordsBySymbol[symbol] || 0) + 1;
        
        if (!oldestRecord || record.createdAt < oldestRecord) {
          oldestRecord = record.createdAt;
        }
        if (!newestRecord || record.createdAt > newestRecord) {
          newestRecord = record.createdAt;
        }
      }

      return {
        totalRecords,
        recordsBySymbol,
        oldestRecord,
        newestRecord
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  /**
   * Start automatic cleanup of old data
   */
  private startAutoCleanup(): void {
    // Run cleanup every 24 hours
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupOldData(undefined, 30); // Keep 30 days of data
      } catch (error) {
        console.error('Auto cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private getTimeframeMilliseconds(timeframe: string): number {
    switch (timeframe) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '1d': return 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  }

  private aggregateBucket(
    symbol: string,
    timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d',
    bucket: MarketData[],
    timestamp: Date
  ): MarketDataAggregation {
    const prices = bucket.map(d => d.price);
    const volumes = bucket.map(d => d.volume);
    
    return {
      symbol,
      timeframe,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: volumes.reduce((sum, vol) => sum + vol, 0),
      timestamp
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopAutoCleanup();
  }
}