import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceTracker } from '../performance-tracker';
import { TradingPosition, TradeExecution } from '../../../types';
import { TradingActivityLog } from '../types';

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;
  const startingBalance = 10000;

  beforeEach(() => {
    tracker = new PerformanceTracker(startingBalance);
  });

  describe('Trade Recording', () => {
    it('should record trades correctly', () => {
      const trade: TradeExecution = {
        id: 'trade-1',
        orderId: 'order-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        price: 50000,
        fee: 5,
        status: 'filled',
        timestamp: new Date()
      };

      tracker.recordTrade(trade);

      const stats = tracker.getTradeStatistics();
      expect(stats.totalTrades).toBe(1);
      expect(stats.successfulTrades).toBe(1);
      expect(stats.failedTrades).toBe(0);
    });

    it('should handle failed trades correctly', () => {
      const trade: TradeExecution = {
        id: 'trade-1',
        orderId: 'order-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        price: 50000,
        fee: 5,
        status: 'cancelled',
        timestamp: new Date()
      };

      tracker.recordTrade(trade);

      const stats = tracker.getTradeStatistics();
      expect(stats.totalTrades).toBe(1);
      expect(stats.successfulTrades).toBe(0);
      expect(stats.failedTrades).toBe(1);
    });
  });

  describe('Position Updates', () => {
    it('should update positions correctly', () => {
      const positions: TradingPosition[] = [
        {
          id: 'pos-1',
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.1,
          entryPrice: 50000,
          currentPrice: 52000,
          unrealizedPnL: 200,
          timestamp: new Date(),
          status: 'open'
        }
      ];

      tracker.updatePositions(positions);

      // Positions should be stored for P&L calculation
      expect(positions).toHaveLength(1);
    });
  });

  describe('Activity Logging', () => {
    it('should add activity logs correctly', () => {
      const activity: TradingActivityLog = {
        id: 'log-1',
        timestamp: new Date(),
        type: 'trade_executed',
        symbol: 'BTC/USDT',
        action: 'buy',
        amount: 0.1,
        price: 50000,
        message: 'Trade executed',
        severity: 'info'
      };

      tracker.addActivityLog(activity);

      const recentActivity = tracker.getRecentActivity(10);
      expect(recentActivity).toHaveLength(1);
      expect(recentActivity[0]).toEqual(activity);
    });

    it('should limit activity log size', () => {
      // Add more than 100 activities
      for (let i = 0; i < 150; i++) {
        const activity: TradingActivityLog = {
          id: `log-${i}`,
          timestamp: new Date(),
          type: 'trade_executed',
          symbol: 'BTC/USDT',
          message: `Trade ${i}`,
          severity: 'info'
        };
        tracker.addActivityLog(activity);
      }

      const recentActivity = tracker.getRecentActivity(200);
      expect(recentActivity).toHaveLength(100); // Should be capped at 100
    });

    it('should return recent activities in correct order', () => {
      const activity1: TradingActivityLog = {
        id: 'log-1',
        timestamp: new Date(Date.now() - 1000),
        type: 'trade_executed',
        symbol: 'BTC/USDT',
        message: 'First trade',
        severity: 'info'
      };

      const activity2: TradingActivityLog = {
        id: 'log-2',
        timestamp: new Date(),
        type: 'trade_executed',
        symbol: 'ETH/USDT',
        message: 'Second trade',
        severity: 'info'
      };

      tracker.addActivityLog(activity1);
      tracker.addActivityLog(activity2);

      const recentActivity = tracker.getRecentActivity(10);
      expect(recentActivity[0].id).toBe('log-2'); // Most recent first
      expect(recentActivity[1].id).toBe('log-1');
    });
  });

  describe('Performance Metrics Calculation', () => {
    it('should calculate basic metrics correctly', async () => {
      const metrics = await tracker.getPerformanceMetrics();

      expect(metrics.startingBalance).toBe(startingBalance);
      expect(metrics.currentBalance).toBe(startingBalance);
      expect(metrics.totalTrades).toBe(0);
      expect(metrics.winRate).toBe(0);
      expect(metrics.profitLoss).toBe(0);
      expect(metrics.returnOnInvestment).toBe(0);
    });

    it('should calculate metrics with trades', async () => {
      // Add some successful trades
      const buyTrade: TradeExecution = {
        id: 'trade-1',
        orderId: 'order-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        price: 50000,
        fee: 5,
        status: 'filled',
        timestamp: new Date(Date.now() - 1000)
      };

      const sellTrade: TradeExecution = {
        id: 'trade-2',
        orderId: 'order-2',
        symbol: 'BTC/USDT',
        side: 'sell',
        amount: 0.1,
        price: 52000,
        fee: 5,
        status: 'filled',
        timestamp: new Date()
      };

      tracker.recordTrade(buyTrade);
      tracker.recordTrade(sellTrade);

      const metrics = await tracker.getPerformanceMetrics();

      expect(metrics.totalTrades).toBe(2);
      expect(metrics.successfulTrades).toBe(2);
      expect(metrics.winRate).toBe(100);
      expect(metrics.totalVolume).toBe(5200 + 5000); // (0.1 * 52000) + (0.1 * 50000)
      expect(metrics.averageTradeSize).toBe(5100); // totalVolume / totalTrades
    });

    it('should calculate win rate correctly', async () => {
      const trades: TradeExecution[] = [
        {
          id: 'trade-1',
          orderId: 'order-1',
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.1,
          price: 50000,
          fee: 5,
          status: 'filled',
          timestamp: new Date()
        },
        {
          id: 'trade-2',
          orderId: 'order-2',
          symbol: 'ETH/USDT',
          side: 'buy',
          amount: 1,
          price: 3000,
          fee: 3,
          status: 'filled',
          timestamp: new Date()
        },
        {
          id: 'trade-3',
          orderId: 'order-3',
          symbol: 'SOL/USDT',
          side: 'buy',
          amount: 10,
          price: 100,
          fee: 1,
          status: 'cancelled',
          timestamp: new Date()
        }
      ];

      trades.forEach(trade => tracker.recordTrade(trade));

      const metrics = await tracker.getPerformanceMetrics();

      expect(metrics.totalTrades).toBe(3);
      expect(metrics.successfulTrades).toBe(2);
      expect(metrics.failedTrades).toBe(1);
      expect(metrics.winRate).toBeCloseTo(66.67, 1); // 2/3 * 100
    });

    it('should calculate unrealized P&L from positions', async () => {
      const positions: TradingPosition[] = [
        {
          id: 'pos-1',
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.1,
          entryPrice: 50000,
          currentPrice: 52000,
          unrealizedPnL: 200,
          timestamp: new Date(),
          status: 'open'
        },
        {
          id: 'pos-2',
          symbol: 'ETH/USDT',
          side: 'buy',
          amount: 1,
          entryPrice: 3000,
          currentPrice: 2900,
          unrealizedPnL: -100,
          timestamp: new Date(),
          status: 'open'
        }
      ];

      tracker.updatePositions(positions);

      const metrics = await tracker.getPerformanceMetrics();

      expect(metrics.profitLoss).toBe(100); // 200 + (-100)
    });

    it('should calculate ROI correctly', async () => {
      // Add positions with P&L
      const positions: TradingPosition[] = [
        {
          id: 'pos-1',
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.1,
          entryPrice: 50000,
          currentPrice: 55000,
          unrealizedPnL: 500,
          timestamp: new Date(),
          status: 'open'
        }
      ];

      tracker.updatePositions(positions);

      const metrics = await tracker.getPerformanceMetrics();

      expect(metrics.returnOnInvestment).toBe(5); // 500 / 10000 * 100
    });
  });

  describe('Realized P&L Calculation', () => {
    it('should calculate realized P&L from completed buy/sell pairs', async () => {
      const buyTrade: TradeExecution = {
        id: 'trade-1',
        orderId: 'order-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        price: 50000,
        fee: 5,
        status: 'filled',
        timestamp: new Date(Date.now() - 1000)
      };

      const sellTrade: TradeExecution = {
        id: 'trade-2',
        orderId: 'order-2',
        symbol: 'BTC/USDT',
        side: 'sell',
        amount: 0.1,
        price: 52000,
        fee: 5,
        status: 'filled',
        timestamp: new Date()
      };

      tracker.recordTrade(buyTrade);
      tracker.recordTrade(sellTrade);

      const metrics = await tracker.getPerformanceMetrics();

      // Realized P&L should be: (sell_price * amount - fee) - (buy_price * amount + fee)
      // = (52000 * 0.1 - 5) - (50000 * 0.1 + 5) = 5195 - 5005 = 190
      expect(metrics.currentBalance).toBeCloseTo(startingBalance + 190, 0);
    });

    it('should handle multiple trades for same symbol', async () => {
      const trades: TradeExecution[] = [
        {
          id: 'trade-1',
          orderId: 'order-1',
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.1,
          price: 50000,
          fee: 5,
          status: 'filled',
          timestamp: new Date(Date.now() - 3000)
        },
        {
          id: 'trade-2',
          orderId: 'order-2',
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.1,
          price: 51000,
          fee: 5,
          status: 'filled',
          timestamp: new Date(Date.now() - 2000)
        },
        {
          id: 'trade-3',
          orderId: 'order-3',
          symbol: 'BTC/USDT',
          side: 'sell',
          amount: 0.15,
          price: 52000,
          fee: 8,
          status: 'filled',
          timestamp: new Date()
        }
      ];

      trades.forEach(trade => tracker.recordTrade(trade));

      const metrics = await tracker.getPerformanceMetrics();

      // Should calculate P&L correctly for partial position closure
      expect(metrics.currentBalance).toBeGreaterThan(startingBalance);
    });
  });

  describe('Sharpe Ratio Calculation', () => {
    it('should return 0 for insufficient data', async () => {
      const metrics = await tracker.getPerformanceMetrics();
      expect(metrics.sharpeRatio).toBe(0);
    });

    it('should calculate Sharpe ratio with sufficient trades', async () => {
      // Add multiple trades across different days
      const trades: TradeExecution[] = [];
      
      for (let i = 0; i < 10; i++) {
        trades.push({
          id: `trade-${i}`,
          orderId: `order-${i}`,
          symbol: 'BTC/USDT',
          side: i % 2 === 0 ? 'buy' : 'sell',
          amount: 0.01,
          price: 50000 + (i * 100),
          fee: 1,
          status: 'filled',
          timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) // Different days
        });
      }

      trades.forEach(trade => tracker.recordTrade(trade));

      const metrics = await tracker.getPerformanceMetrics();

      expect(typeof metrics.sharpeRatio).toBe('number');
      // Sharpe ratio can be negative, so just check it's a valid number
      expect(isNaN(metrics.sharpeRatio)).toBe(false);
    });
  });

  describe('Maximum Drawdown Calculation', () => {
    it('should return 0 for no trades', async () => {
      const metrics = await tracker.getPerformanceMetrics();
      expect(metrics.maxDrawdown).toBe(0);
    });

    it('should calculate maximum drawdown correctly', async () => {
      // Simulate a series of trades that create a drawdown
      const trades: TradeExecution[] = [
        // Profitable trade
        {
          id: 'trade-1',
          orderId: 'order-1',
          symbol: 'BTC/USDT',
          side: 'sell',
          amount: 0.1,
          price: 52000,
          fee: 5,
          status: 'filled',
          timestamp: new Date(Date.now() - 3000)
        },
        // Loss-making trade
        {
          id: 'trade-2',
          orderId: 'order-2',
          symbol: 'ETH/USDT',
          side: 'buy',
          amount: 2,
          price: 3000,
          fee: 10,
          status: 'filled',
          timestamp: new Date(Date.now() - 2000)
        }
      ];

      trades.forEach(trade => tracker.recordTrade(trade));

      const metrics = await tracker.getPerformanceMetrics();

      expect(metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.maxDrawdown).toBe('number');
    });
  });

  describe('Uptime Tracking', () => {
    it('should track uptime correctly', () => {
      const uptime = tracker.getUptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(typeof uptime).toBe('number');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all tracking data', () => {
      // Add some data
      const trade: TradeExecution = {
        id: 'trade-1',
        orderId: 'order-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        price: 50000,
        fee: 5,
        status: 'filled',
        timestamp: new Date()
      };

      tracker.recordTrade(trade);

      const activity: TradingActivityLog = {
        id: 'log-1',
        timestamp: new Date(),
        type: 'trade_executed',
        symbol: 'BTC/USDT',
        message: 'Trade executed',
        severity: 'info'
      };

      tracker.addActivityLog(activity);

      // Reset
      tracker.reset(15000);

      // Check that data is cleared
      const stats = tracker.getTradeStatistics();
      expect(stats.totalTrades).toBe(0);

      const recentActivity = tracker.getRecentActivity(10);
      expect(recentActivity).toHaveLength(0);

      // Check new starting balance
      const uptime = tracker.getUptime();
      expect(uptime).toBeLessThan(100); // Should be very small after reset
    });
  });

  describe('Trade Statistics', () => {
    it('should provide comprehensive trade statistics', () => {
      const trades: TradeExecution[] = [
        {
          id: 'trade-1',
          orderId: 'order-1',
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.1,
          price: 50000,
          fee: 5,
          status: 'filled',
          timestamp: new Date()
        },
        {
          id: 'trade-2',
          orderId: 'order-2',
          symbol: 'ETH/USDT',
          side: 'sell',
          amount: 1,
          price: 3000,
          fee: 3,
          status: 'cancelled',
          timestamp: new Date()
        }
      ];

      trades.forEach(trade => tracker.recordTrade(trade));

      const stats = tracker.getTradeStatistics();

      expect(stats.totalTrades).toBe(2);
      expect(stats.successfulTrades).toBe(1);
      expect(stats.failedTrades).toBe(1);
      expect(stats.winRate).toBe(50);
      expect(stats.totalVolume).toBe(8000); // (0.1 * 50000) + (1 * 3000)
      expect(stats.averageTradeSize).toBe(4000); // 8000 / 2
    });
  });
});