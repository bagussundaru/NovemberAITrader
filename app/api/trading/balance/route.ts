import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client'
import { getBinanceClient } from "@/lib/exchanges/binance-futures-client";
import { BybitService } from "@/lib/trading-bot/services/bybit/bybit-service";

const prisma = new PrismaClient()

/**
 * Get account balance endpoint with real Binance data
 * Requirements: 5.1
 */
export async function GET() {
  try {
    const provider = (process.env.EXCHANGE_PROVIDER || 'BINANCE').toUpperCase();
    if (provider === 'BYBIT') {
      const errorHandler = { logError: (e: Error) => console.error(e) } as any;
      const bybitBase = process.env.BYBIT_BASE_URL || (process.env.BYBIT_TESTNET === 'true' ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com');
      const bybit = new BybitService({
        baseUrl: bybitBase,
        apiKey: process.env.BYBIT_API_KEY || '',
        apiSecret: process.env.BYBIT_API_SECRET || '',
        testnet: process.env.BYBIT_TESTNET === 'true'
      }, errorHandler);

      await bybit.authenticate();
      const balancesMap = await bybit.getAccountBalance();
      const totals = Object.values(balancesMap).reduce((acc: { available: number; locked: number }, b: any) => {
        acc.available += Number((b as any).available || 0);
        acc.locked += Number((b as any).locked || 0);
        return acc;
      }, { available: 0, locked: 0 });

      const totalBalance = totals.available + totals.locked;
      return NextResponse.json({
        success: true,
        data: {
          total: totalBalance,
          available: totals.available,
          locked: totals.locked,
          currency: 'USDT',
          balances: balancesMap,
          performance: {
            totalPnL: 0,
            dailyPnL: 0,
            roi: 0
          },
          positions: [],
          lastUpdate: new Date().toISOString()
        },
        source: 'Bybit'
      });
    }

    // Try to get real balance from Binance first
    const binanceClient = getBinanceClient();
    
    try {
      const isConnected = await binanceClient.testConnection();
      if (isConnected) {
        // Get real balance and positions from Binance
        const [balanceData, positionsData] = await Promise.all([
          binanceClient.getFormattedBalance(),
          binanceClient.getFormattedPositions()
        ]);

        // Calculate locked balance from positions
        const lockedBalance = positionsData.reduce((sum, pos) => {
          return sum + Math.abs(pos.size * pos.markPrice);
        }, 0);

        // Calculate total P&L
        const totalPnL = positionsData.reduce((sum, pos) => sum + pos.pnl, 0);

        return NextResponse.json({
          success: true,
          data: {
            total: balanceData.totalBalance,
            available: balanceData.availableBalance,
            locked: lockedBalance,
            currency: 'USDT',
            balances: balanceData.assets.reduce((acc, asset) => {
              acc[asset.asset] = {
                available: asset.available,
                locked: asset.balance - asset.available
              };
              return acc;
            }, {} as any),
            performance: {
              totalPnL,
              dailyPnL: totalPnL, // Real-time P&L from Binance
              roi: balanceData.totalBalance > 0 ? (totalPnL / balanceData.totalBalance) * 100 : 0
            },
            positions: positionsData,
            lastUpdate: new Date().toISOString()
          },
          source: 'Binance Futures Testnet'
        });
      }
    } catch (binanceError) {
      console.error("Binance API error, falling back to database:", binanceError);
    }

    // Fallback to database + mock data if Binance fails
    const openPositions = await prisma.tradingPosition.findMany({
      where: { status: 'OPEN' }
    })
    
    // Calculate locked balance (value of open positions)
    const lockedBalance = openPositions.reduce((sum, pos) => {
      return sum + (pos.amount * (pos.currentPrice || 0))
    }, 0)
    
    // Calculate total P&L
    const totalPnL = openPositions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0)
    
    // Starting balance + P&L
    const startingBalance = Number(process.env.STARTING_BALANCE || 10000)
    const totalBalance = startingBalance + totalPnL
    const availableBalance = totalBalance - lockedBalance

    return NextResponse.json({
      success: true,
      data: {
        total: totalBalance,
        available: availableBalance,
        locked: lockedBalance,
        currency: 'USDT',
        balances: {
          USDT: {
            available: availableBalance,
            locked: lockedBalance
          },
          BTC: {
            available: 0,
            locked: openPositions.filter(p => p.symbol.includes('BTC')).reduce((sum, p) => sum + p.amount, 0)
          },
          ETH: {
            available: 0,
            locked: openPositions.filter(p => p.symbol.includes('ETH')).reduce((sum, p) => sum + p.amount, 0)
          }
        },
        performance: {
          totalPnL,
          dailyPnL: totalPnL * 0.3, // Assume 30% of total P&L is from today
          roi: (totalPnL / startingBalance) * 100
        },
        positions: openPositions.map(pos => ({
          symbol: pos.symbol,
          side: pos.side,
          size: pos.amount,
          entryPrice: pos.entryPrice,
          markPrice: pos.currentPrice || pos.entryPrice,
          pnl: pos.unrealizedPnL || 0,
          pnlPercent: pos.currentPrice && pos.entryPrice ? 
            ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0,
          leverage: 1
        })),
        lastUpdate: new Date().toISOString()
      },
      source: 'Database + Mock Data'
    });

  } catch (error) {
    console.error("Error getting account balance:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to get account balance",
      error: (error as Error).message,
      data: {
        total: 10000,
        available: 9500,
        locked: 500,
        currency: 'USDT',
        balances: {
          USDT: { available: 9500, locked: 500 }
        },
        performance: {
          totalPnL: 0,
          dailyPnL: 0,
          roi: 0
        },
        positions: [],
        lastUpdate: new Date().toISOString()
      },
      source: 'Fallback Mock Data'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect()
  }
}