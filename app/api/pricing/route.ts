import { NextResponse } from 'next/server'
import { BybitService } from '@/lib/trading-bot/services/bybit/bybit-service'

// Symbols to track
const TRACKED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'];

export async function GET() {
  try {
    const bybitBase = process.env.BYBIT_BASE_URL || 'https://api.bybit.com'
    const bybit = new BybitService({
      baseUrl: bybitBase,
      apiKey: process.env.BYBIT_API_KEY || '',
      apiSecret: process.env.BYBIT_API_SECRET || '',
      testnet: process.env.BYBIT_TESTNET === 'true'
    }, {
      logError: (e: Error, c: string) => console.error(`[${c}] ${e.message}`),
      handleNebiusError: () => {},
      handleGateError: () => {},
      handleNetworkError: () => {}
    })

    const pricing: Record<string, any> = {}
    for (const s of TRACKED_SYMBOLS) {
      try {
        const data = await bybit.getMarketData(s.replace('USDT', '/USDT'))
        const displaySymbol = s.replace('USDT', '/USDT')
        pricing[displaySymbol] = {
          symbol: displaySymbol,
          price: data.price,
          change24h: undefined,
          volume24h: data.volume,
          high24h: undefined,
          low24h: undefined,
          lastUpdate: new Date().toISOString()
        }
      } catch (err) {
        console.error(`Error fetching ${s}:`, err)
      }
    }

    // If no data was fetched, return error
    if (Object.keys(pricing).length === 0) {
      throw new Error('No pricing data available');
    }

    return NextResponse.json({
      success: true,
      data: pricing,
      timestamp: new Date().toISOString(),
      source: process.env.BYBIT_TESTNET === 'true' ? 'Bybit Testnet' : 'Bybit Live'
    });

  } catch (error) {
    console.error('Error fetching real pricing data:', error);
    
    // Fallback to mock data if real API fails
    const mockPricing = {
      'BTC/USDT': {
        symbol: 'BTC/USDT',
        price: 67500.00,
        change24h: 2.45,
        volume24h: 28500000000,
        high24h: 68200.00,
        low24h: 66800.00,
        lastUpdate: new Date().toISOString()
      },
      'ETH/USDT': {
        symbol: 'ETH/USDT',
        price: 3850.00,
        change24h: 1.85,
        volume24h: 15200000000,
        high24h: 3920.00,
        low24h: 3780.00,
        lastUpdate: new Date().toISOString()
      },
      'BNB/USDT': {
        symbol: 'BNB/USDT',
        price: 635.50,
        change24h: -0.75,
        volume24h: 890000000,
        high24h: 645.00,
        low24h: 628.00,
        lastUpdate: new Date().toISOString()
      },
      'SOL/USDT': {
        symbol: 'SOL/USDT',
        price: 185.25,
        change24h: 3.20,
        volume24h: 2100000000,
        high24h: 192.00,
        low24h: 178.50,
        lastUpdate: new Date().toISOString()
      },
      'DOGE/USDT': {
        symbol: 'DOGE/USDT',
        price: 0.385,
        change24h: 5.80,
        volume24h: 1800000000,
        high24h: 0.395,
        low24h: 0.365,
        lastUpdate: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      data: mockPricing,
      timestamp: new Date().toISOString(),
      source: 'Mock Data (Binance API Failed)',
      error: (error as Error).message
    });
  }
}