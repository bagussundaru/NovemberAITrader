import { NextResponse } from "next/server";

export async function GET() {
  // Return realistic demo data for live trading bot
  return NextResponse.json({
    success: true,
    data: {
      accountBalance: {
        total: 10004.20,
        available: 9740.00,
        locked: 264.20,
        currency: 'USDT',
        lastUpdate: new Date().toISOString()
      },
      positions: {
        open: [
          {
            id: 'pos_001',
            symbol: 'BTC/USDT',
            side: 'buy',
            amount: 0.001,
            entryPrice: 67500.00,
            currentPrice: 68200.00,
            unrealizedPnL: 0.70,
            timestamp: new Date().toISOString(),
            status: 'open'
          },
          {
            id: 'pos_002',
            symbol: 'ETH/USDT',
            side: 'buy',
            amount: 0.05,
            entryPrice: 3850.00,
            currentPrice: 3920.00,
            unrealizedPnL: 3.50,
            timestamp: new Date().toISOString(),
            status: 'open'
          }
        ],
        totalValue: 264.20,
        totalPnL: 4.20,
        count: 2
      },
      performance: {
        totalTrades: 2,
        profitLoss: 4.20,
        winRate: 1.0,
        sharpeRatio: 1.2,
        maxDrawdown: -150.00,
        uptime: Math.floor(process.uptime()),
        averageTradeSize: 132.10,
        totalVolume: 264.20,
        successfulTrades: 2,
        failedTrades: 0,
        currentBalance: 10004.20,
        startingBalance: 10000,
        returnOnInvestment: 0.00042
      },
      recentActivity: [
        {
          id: 'signal_001',
          type: 'signal',
          symbol: 'BTC/USDT',
          action: 'BUY',
          confidence: 0.85,
          reasoning: 'Strong bullish momentum with RSI oversold recovery',
          timestamp: new Date().toISOString()
        },
        {
          id: 'signal_002',
          type: 'signal',
          symbol: 'ETH/USDT',
          action: 'HOLD',
          confidence: 0.72,
          reasoning: 'Consolidation phase, waiting for breakout confirmation',
          timestamp: new Date().toISOString()
        }
      ],
      systemHealth: {
        isRunning: false,
        uptime: Math.floor(process.uptime()),
        lastUpdate: new Date().toISOString(),
        services: {
          nebiusAI: { isConnected: false, lastPing: new Date().toISOString(), responseTime: 0, errorCount: 0, status: 'down' },
          gateExchange: { isConnected: false, lastPing: new Date().toISOString(), responseTime: 0, errorCount: 0, status: 'down' },
          marketData: { isConnected: true, lastPing: new Date().toISOString(), responseTime: 45, errorCount: 0, status: 'up' },
          riskManagement: { isConnected: true, lastPing: new Date().toISOString(), responseTime: 12, errorCount: 0, status: 'up' }
        },
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpuUsage: 25.5,
        networkLatency: 45,
        errorRate: 0.02
      }
    }
  });
}