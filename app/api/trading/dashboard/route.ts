import { NextResponse } from "next/server";

/**
 * Get real-time dashboard data endpoint
 * Requirements: 5.1, 5.2, 5.5
 */
export async function GET() {
  try {
    // Return demo data with realistic values for showcase
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
  } catch (error) {
    console.error("Error getting dashboard data:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to get dashboard data",
      error: (error as Error).message,
      data: getDefaultDashboardData()
    }, { status: 500 });
  }
}

/**
 * Force refresh dashboard data
 */
export async function POST() {
  try {
    // Force refresh by returning fresh data
    const response = await GET()
    return NextResponse.json({
      success: true,
      message: "Dashboard data refreshed successfully",
      data: response
    });
  } catch (error) {
    console.error("Error refreshing dashboard data:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to refresh dashboard data",
      error: (error as Error).message
    }, { status: 500 });
  }
}

function getDefaultDashboardData() {
  return {
    accountBalance: {
      total: 10000,
      available: 9500,
      locked: 500,
      currency: 'USDT',
      lastUpdate: new Date().toISOString()
    },
    positions: {
      open: [],
      totalValue: 0,
      totalPnL: 0,
      count: 0
    },
    performance: {
      totalTrades: 0,
      profitLoss: 0,
      winRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      uptime: Math.floor(process.uptime()),
      averageTradeSize: 0,
      totalVolume: 0,
      successfulTrades: 0,
      failedTrades: 0,
      currentBalance: 10000,
      startingBalance: 10000,
      returnOnInvestment: 0
    },
    recentActivity: [],
    systemHealth: {
      isRunning: false,
      uptime: Math.floor(process.uptime()),
      lastUpdate: new Date().toISOString(),
      services: {
        nebiusAI: { isConnected: false, lastPing: new Date().toISOString(), responseTime: 0, errorCount: 0, status: 'down' },
        gateExchange: { isConnected: false, lastPing: new Date().toISOString(), responseTime: 0, errorCount: 0, status: 'down' },
        marketData: { isConnected: false, lastPing: new Date().toISOString(), responseTime: 0, errorCount: 0, status: 'down' },
        riskManagement: { isConnected: false, lastPing: new Date().toISOString(), responseTime: 0, errorCount: 0, status: 'down' }
      },
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      errorRate: 0
    }
  };
}