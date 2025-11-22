/**
 * Advanced Trading Executor
 * Menggunakan analitik CVD, Volume, Chart Pattern, dan VRVP untuk automated trading
 *
 * Focus: ETH/USDT pada Bybit Perpetual
 * AI Engine: DeepSeek-V3 via Nebius Platform
 */

import {
  performAdvancedAnalysis,
  CandleData,
  OrderBookData,
  AdvancedMarketAnalysis,
  TradingSignal
} from '../analytics/advanced-market-analytics';

export interface BybitPerpetualClient {
  getKlines(symbol: string, interval: string, limit: number): Promise<any[]>;
  getOrderBook(symbol: string, limit: number): Promise<any>;
  createOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
    stopPrice?: number;
  }): Promise<any>;
  getBalance(): Promise<any>;
  getPosition(symbol: string): Promise<any>;
  closePosition(symbol: string): Promise<any>;
}

export interface TradingBotConfig {
  symbol: string;
  timeframe: string;
  maxPositionSize: number;
  minConfidence: number;
  enableAutoTrading: boolean;
  updateInterval: number; // milliseconds
}

export interface BotStatus {
  isRunning: boolean;
  symbol: string;
  currentAnalysis: AdvancedMarketAnalysis | null;
  currentPosition: {
    side: 'LONG' | 'SHORT' | null;
    entryPrice: number | null;
    size: number | null;
    stopLoss: number | null;
    takeProfit: number | null;
  };
  stats: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalPnL: number;
  };
  lastUpdate: number;
}

export class AdvancedTradingExecutor {
  private client: BybitPerpetualClient;
  private config: TradingBotConfig;
  private status: BotStatus;
  private updateTimer: NodeJS.Timeout | null = null;
  private historicalVolume: Array<{ price: number; volume: number }> = [];

  constructor(client: BybitPerpetualClient, config: TradingBotConfig) {
    this.client = client;
    this.config = config;
    this.status = {
      isRunning: false,
      symbol: config.symbol,
      currentAnalysis: null,
      currentPosition: {
        side: null,
        entryPrice: null,
        size: null,
        stopLoss: null,
        takeProfit: null
      },
      stats: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0
      },
      lastUpdate: Date.now()
    };
  }

  /**
   * Start the trading bot
   */
  async start(): Promise<void> {
    if (this.status.isRunning) {
      console.log('⚠️ Trading bot is already running');
      return;
    }

    console.log(`🚀 Starting Advanced Trading Executor for ${this.config.symbol}`);
    this.status.isRunning = true;

    // Initial analysis
    await this.updateAnalysis();

    // Set up periodic updates
    this.updateTimer = setInterval(async () => {
      await this.updateAnalysis();
      await this.checkAndExecuteTrades();
    }, this.config.updateInterval);

    console.log(`✅ Trading bot started - updating every ${this.config.updateInterval}ms`);
  }

  /**
   * Stop the trading bot
   */
  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.status.isRunning = false;
    console.log('🛑 Trading bot stopped');
  }

  /**
   * Update market analysis with latest data
   */
  private async updateAnalysis(): Promise<void> {
    try {
      console.log(`📊 Updating analysis for ${this.config.symbol}...`);

      // Fetch candle data (50 candles untuk analisis CVD dan pattern)
      const klinesData = await this.client.getKlines(
        this.config.symbol,
        this.config.timeframe,
        50
      );

      // Convert to CandleData format
      const candles: CandleData[] = klinesData.map((k: any) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        // Binance provides taker buy volume, we can use it to estimate buy/sell
        buyVolume: parseFloat(k[9] || k[5] * 0.5),
        sellVolume: parseFloat(k[5]) - parseFloat(k[9] || k[5] * 0.5)
      }));

      // Fetch order book
      const orderBookData = await this.client.getOrderBook(this.config.symbol, 100);
      const orderBook: OrderBookData = {
        bids: orderBookData.bids.map((b: any) => ({
          price: parseFloat(b[0]),
          quantity: parseFloat(b[1])
        })),
        asks: orderBookData.asks.map((a: any) => ({
          price: parseFloat(a[0]),
          quantity: parseFloat(a[1])
        })),
        timestamp: Date.now()
      };

      // Build historical volume profile
      this.updateHistoricalVolume(candles);

      // Perform advanced analysis
      const analysis = performAdvancedAnalysis(
        this.config.symbol,
        candles,
        orderBook,
        this.historicalVolume,
        this.config.timeframe
      );

      this.status.currentAnalysis = analysis;
      this.status.lastUpdate = Date.now();

      this.logAnalysis(analysis);

    } catch (error) {
      console.error('❌ Error updating analysis:', error);
    }
  }

  /**
   * Update historical volume profile for VRVP analysis
   */
  private updateHistoricalVolume(candles: CandleData[]): void {
    for (const candle of candles) {
      // Group by price ranges
      const priceRange = Math.floor(candle.close / 10) * 10;

      const existing = this.historicalVolume.find(v => Math.abs(v.price - priceRange) < 5);
      if (existing) {
        existing.volume += candle.volume;
      } else {
        this.historicalVolume.push({
          price: priceRange,
          volume: candle.volume
        });
      }
    }

    // Keep only last 1000 entries
    if (this.historicalVolume.length > 1000) {
      this.historicalVolume = this.historicalVolume.slice(-1000);
    }
  }

  /**
   * Check analysis and execute trades if conditions are met
   */
  private async checkAndExecuteTrades(): Promise<void> {
    if (!this.config.enableAutoTrading) {
      console.log('⏸️ Auto-trading disabled, skipping execution');
      return;
    }

    if (!this.status.currentAnalysis) {
      console.log('⚠️ No analysis available yet');
      return;
    }

    const analysis = this.status.currentAnalysis;
    const signal = analysis.signal;

    // Check if we should execute a trade
    if (signal.confidence < this.config.minConfidence) {
      console.log(`⏸️ Signal confidence too low: ${signal.confidence}% (min: ${this.config.minConfidence}%)`);
      return;
    }

    // RULE: Jangan entry jika volume terlalu rendah
    if (analysis.volume.significance === 'LOW') {
      console.log('⏸️ Volume too low - skipping trade');
      return;
    }

    // RULE: Jangan trading di hunter zones
    const nearHunterZone = analysis.vrvp.liquidityZones.some(zone =>
      zone.isHunterZone &&
      signal.entryPrice &&
      Math.abs(zone.price - signal.entryPrice) / signal.entryPrice < 0.01
    );

    if (nearHunterZone) {
      console.log('🚫 Near hunter zone - AVOIDING TRADE');
      return;
    }

    // Execute trade based on signal
    await this.executeTrade(signal);
  }

  /**
   * Execute a trade based on the signal
   */
  private async executeTrade(signal: TradingSignal): Promise<void> {
    try {
      // Close existing position if signal suggests opposite direction
      if (this.status.currentPosition.side) {
        const shouldClose = (
          (this.status.currentPosition.side === 'LONG' && signal.action === 'SHORT') ||
          (this.status.currentPosition.side === 'SHORT' && signal.action === 'LONG') ||
          signal.action === 'EXIT'
        );

        if (shouldClose) {
          console.log(`🔄 Closing existing ${this.status.currentPosition.side} position`);
          await this.closeCurrentPosition();
        }
      }

      // Don't open new position if signal is HOLD or EXIT
      if (signal.action === 'HOLD' || signal.action === 'EXIT') {
        return;
      }

      // Calculate position size based on risk
      const balance = await this.client.getBalance();
      const accountBalance = parseFloat(balance.availableBalance || balance.balance || '1000');

      let positionSize = this.config.maxPositionSize;

      // Reduce position size based on risk level
      if (signal.riskLevel === 'HIGH') {
        positionSize *= 0.5;
      } else if (signal.riskLevel === 'EXTREME') {
        positionSize *= 0.25;
      }

      // Ensure position size doesn't exceed account balance
      positionSize = Math.min(positionSize, accountBalance * 0.1); // Max 10% of account

      console.log(`📈 Opening ${signal.action} position:`);
      console.log(`   Entry: ${signal.entryPrice}`);
      console.log(`   Size: ${positionSize} USDT`);
      console.log(`   Stop Loss: ${signal.stopLoss}`);
      console.log(`   Take Profit: ${signal.takeProfit}`);
      console.log(`   Confidence: ${signal.confidence}%`);
      console.log(`   Risk Level: ${signal.riskLevel}`);

      // Create market order
      const side = signal.action === 'LONG' ? 'BUY' : 'SELL';
      const quantity = positionSize / (signal.entryPrice || 1);

      const order = await this.client.createOrder({
        symbol: this.config.symbol,
        side,
        type: 'MARKET',
        quantity
      });

      // Update position status
      this.status.currentPosition = {
        side: signal.action,
        entryPrice: signal.entryPrice || 0,
        size: quantity,
        stopLoss: signal.stopLoss || 0,
        takeProfit: signal.takeProfit || 0
      };

      this.status.stats.totalTrades++;

      console.log(`✅ Order executed successfully:`, order);

      // Set stop loss and take profit orders
      if (signal.stopLoss) {
        await this.setStopLoss(signal.stopLoss, quantity);
      }

      if (signal.takeProfit) {
        await this.setTakeProfit(signal.takeProfit, quantity);
      }

    } catch (error) {
      console.error('❌ Error executing trade:', error);
    }
  }

  /**
   * Close current position
   */
  private async closeCurrentPosition(): Promise<void> {
    try {
      if (!this.status.currentPosition.side) {
        return;
      }

      const result = await this.client.closePosition(this.config.symbol);

      // Calculate PnL
      const currentPrice = result.price || 0;
      const entryPrice = this.status.currentPosition.entryPrice || 0;
      const size = this.status.currentPosition.size || 0;

      let pnl = 0;
      if (this.status.currentPosition.side === 'LONG') {
        pnl = (currentPrice - entryPrice) * size;
      } else {
        pnl = (entryPrice - currentPrice) * size;
      }

      this.status.stats.totalPnL += pnl;

      if (pnl > 0) {
        this.status.stats.winningTrades++;
        console.log(`✅ Position closed with profit: $${pnl.toFixed(2)}`);
      } else {
        this.status.stats.losingTrades++;
        console.log(`❌ Position closed with loss: $${pnl.toFixed(2)}`);
      }

      // Reset position
      this.status.currentPosition = {
        side: null,
        entryPrice: null,
        size: null,
        stopLoss: null,
        takeProfit: null
      };

    } catch (error) {
      console.error('❌ Error closing position:', error);
    }
  }

  /**
   * Set stop loss order
   */
  private async setStopLoss(stopPrice: number, quantity: number): Promise<void> {
    try {
      const side = this.status.currentPosition.side === 'LONG' ? 'SELL' : 'BUY';

      await this.client.createOrder({
        symbol: this.config.symbol,
        side,
        type: 'MARKET',
        quantity,
        stopPrice
      });

      console.log(`🛡️ Stop loss set at ${stopPrice}`);
    } catch (error) {
      console.error('❌ Error setting stop loss:', error);
    }
  }

  /**
   * Set take profit order
   */
  private async setTakeProfit(takeProfit: number, quantity: number): Promise<void> {
    try {
      const side = this.status.currentPosition.side === 'LONG' ? 'SELL' : 'BUY';

      await this.client.createOrder({
        symbol: this.config.symbol,
        side,
        type: 'LIMIT',
        quantity,
        price: takeProfit
      });

      console.log(`🎯 Take profit set at ${takeProfit}`);
    } catch (error) {
      console.error('❌ Error setting take profit:', error);
    }
  }

  /**
   * Log analysis results
   */
  private logAnalysis(analysis: AdvancedMarketAnalysis): void {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 ADVANCED MARKET ANALYSIS - ${analysis.symbol}`);
    console.log('='.repeat(80));

    console.log('\n📉 CHART PATTERN:');
    console.log(`   Type: ${analysis.pattern.type}`);
    console.log(`   Price Change: ${analysis.pattern.priceChange.toFixed(2)}%`);
    console.log(`   Momentum: ${analysis.pattern.momentum}`);
    console.log(`   Confidence: ${analysis.pattern.confidence}%`);

    console.log('\n📊 VOLUME ANALYSIS:');
    console.log(`   Current Volume: ${(analysis.volume.currentVolume / 1000).toFixed(1)}K`);
    console.log(`   Average Volume: ${(analysis.volume.averageVolume / 1000).toFixed(1)}K`);
    console.log(`   Volume Ratio: ${analysis.volume.volumeRatio.toFixed(2)}x`);
    console.log(`   Significance: ${analysis.volume.significance}`);
    console.log(`   Volume Surge: ${analysis.volume.isSurge ? 'YES ⚡' : 'NO'}`);

    console.log('\n💰 CVD (Cumulative Volume Delta):');
    console.log(`   CVD: ${(analysis.cvd.cvd / 1000000000).toFixed(2)}B`);
    console.log(`   Trend: ${analysis.cvd.trend}`);
    console.log(`   Pressure: ${analysis.cvd.pressure}`);
    console.log(`   Magnitude: ${analysis.cvd.magnitude.toFixed(1)}`);

    console.log('\n📍 VRVP & LIQUIDITY ZONES:');
    console.log(`   Support Levels: ${analysis.vrvp.supportLevels.slice(0, 3).map(s => s.toFixed(2)).join(', ')}`);
    console.log(`   Resistance Levels: ${analysis.vrvp.resistanceLevels.slice(0, 3).map(r => r.toFixed(2)).join(', ')}`);

    const hunterZones = analysis.vrvp.liquidityZones.filter(z => z.isHunterZone);
    if (hunterZones.length > 0) {
      console.log(`   ⚠️  HUNTER ZONES DETECTED: ${hunterZones.length}`);
      hunterZones.forEach(zone => {
        console.log(`      ${zone.type} at ${zone.price.toFixed(2)} - Volume: ${(zone.volume / 1000).toFixed(1)}K`);
      });
    }

    console.log('\n🎯 TRADING SIGNAL:');
    console.log(`   Action: ${analysis.signal.action}`);
    console.log(`   Confidence: ${analysis.signal.confidence.toFixed(1)}%`);
    console.log(`   Entry Price: ${analysis.signal.entryPrice?.toFixed(2) || 'N/A'}`);
    console.log(`   Stop Loss: ${analysis.signal.stopLoss?.toFixed(2) || 'N/A'}`);
    console.log(`   Take Profit: ${analysis.signal.takeProfit?.toFixed(2) || 'N/A'}`);
    console.log(`   Risk Level: ${analysis.signal.riskLevel}`);
    console.log('\n   Reasoning:');
    analysis.signal.reasoning.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Get current bot status
   */
  getStatus(): BotStatus {
    return { ...this.status };
  }

  /**
   * Get current analysis
   */
  getCurrentAnalysis(): AdvancedMarketAnalysis | null {
    return this.status.currentAnalysis;
  }
}

/**
 * Factory function to create and start a trading bot for Bybit Perpetual
 */
export async function createAdvancedTradingBot(
  client: BybitPerpetualClient,
  config: Partial<TradingBotConfig> = {}
): Promise<AdvancedTradingExecutor> {
  const defaultConfig: TradingBotConfig = {
    symbol: 'ETHUSDT',
    timeframe: '1h',
    maxPositionSize: 100, // USDT
    minConfidence: 70,
    enableAutoTrading: true,
    updateInterval: 60000, // 1 minute - update setiap candle baru (1h timeframe)
    ...config
  };

  const bot = new AdvancedTradingExecutor(client, defaultConfig);
  await bot.start();

  return bot;
}
