import { NextResponse } from 'next/server'
import { getBinanceClient } from '@/lib/exchanges/binance-futures-client'

// Symbols to track
const TRACKED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'];

export async function GET() {
  try {
    const binanceClient = getBinanceClient();
    
    // Test connection first
    const isConnected = await binanceClient.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Binance API');
    }

    // Get 24hr ticker data for tracked symbols
    const tickerPromises = TRACKED_SYMBOLS.map(symbol => 
      binanceClient.get24hrTicker(symbol).catch(error => {
        console.error(`Error fetching ${symbol}:`, error);
        return null;
      })
    );

    const tickerResults = await Promise.all(tickerPromises);
    
    // Format the data
    const pricing: Record<string, any> = {};
    
    tickerResults.forEach((ticker, index) => {
      if (ticker && ticker.length > 0) {
        const data = ticker[0];
        const symbol = TRACKED_SYMBOLS[index];
        const displaySymbol = symbol.replace('USDT', '/USDT');
        
        pricing[displaySymbol] = {
          symbol: displaySymbol,
          price: parseFloat(data.lastPrice),
          change24h: parseFloat(data.priceChangePercent),
          volume24h: parseFloat(data.volume),
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          lastUpdate: new Date().toISOString(),
          // Additional Binance data
          openPrice: parseFloat(data.openPrice),
          closePrice: parseFloat(data.lastPrice),
          count: parseInt(data.count)
        };
      }
    });

    // If no data was fetched, return error
    if (Object.keys(pricing).length === 0) {
      throw new Error('No pricing data available');
    }

    return NextResponse.json({
      success: true,
      data: pricing,
      timestamp: new Date().toISOString(),
      source: 'Binance Futures Testnet'
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