// Market Data Analysis Service
// Implements advanced technical analysis and market trend analysis

import { MarketData, TechnicalIndicators } from '../../types';
import { MarketDataStorage } from './market-data-storage';

interface AdvancedIndicators extends TechnicalIndicators {
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  williams: number;
  atr: number; // Average True Range
  obv: number; // On-Balance Volume
}

interface TrendAnalysis {
  direction: 'bullish' | 'bearish' | 'sideways';
  strength: number; // 0-100
  confidence: number; // 0-100
  support: number;
  resistance: number;
  momentum: 'increasing' | 'decreasing' | 'stable';
  volatility: 'low' | 'medium' | 'high';
}

interface MarketSignal {
  type: 'buy' | 'sell' | 'hold';
  strength: number; // 0-100
  confidence: number; // 0-100
  reasoning: string[];
  indicators: {
    rsi: { value: number; signal: 'oversold' | 'overbought' | 'neutral' };
    macd: { value: number; signal: 'bullish' | 'bearish' | 'neutral' };
    bollinger: { position: 'upper' | 'lower' | 'middle'; signal: string };
    volume: { trend: 'increasing' | 'decreasing' | 'stable'; signal: string };
  };
}

interface PricePattern {
  name: string;
  type: 'reversal' | 'continuation';
  reliability: number; // 0-100
  target: number;
  stopLoss: number;
  timeframe: string;
}

export class MarketDataAnalysis {
  private storage: MarketDataStorage;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 60000; // 1 minute cache

  constructor(storage: MarketDataStorage) {
    this.storage = storage;
  }

  /**
   * Calculate advanced technical indicators
   */
  async calculateAdvancedIndicators(symbol: string, period: number = 200): Promise<AdvancedIndicators> {
    const cacheKey = `advanced_indicators_${symbol}_${period}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const priceHistory = await this.storage.getPriceHistory(symbol, period);
    const volumeHistory = await this.storage.getVolumeHistory(symbol, period);
    const historicalData = await this.storage.getHistoricalData({
      symbol,
      limit: period,
      orderBy: 'timestamp',
      orderDirection: 'asc'
    });

    if (priceHistory.length < 20) {
      // Return default values if insufficient data
      const defaultIndicators: AdvancedIndicators = {
        rsi: 50,
        macd: 0,
        movingAverage: priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : 0,
        bollinger: { upper: 0, middle: 0, lower: 0 },
        stochastic: { k: 50, d: 50 },
        williams: -50,
        atr: 0,
        obv: 0
      };
      this.setCachedResult(cacheKey, defaultIndicators);
      return defaultIndicators;
    }

    const currentPrice = priceHistory[priceHistory.length - 1];
    
    const indicators: AdvancedIndicators = {
      rsi: this.calculateRSI(priceHistory, 14),
      macd: this.calculateMACD(priceHistory, 12, 26, 9),
      movingAverage: this.calculateSMA(priceHistory, 20),
      bollinger: this.calculateBollingerBands(priceHistory, 20, 2),
      stochastic: this.calculateStochastic(historicalData, 14),
      williams: this.calculateWilliamsR(historicalData, 14),
      atr: this.calculateATR(historicalData, 14),
      obv: this.calculateOBV(priceHistory, volumeHistory)
    };

    this.setCachedResult(cacheKey, indicators);
    return indicators;
  }

  /**
   * Analyze market trend and direction
   */
  async analyzeTrend(symbol: string, period: number = 100): Promise<TrendAnalysis> {
    const cacheKey = `trend_analysis_${symbol}_${period}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const priceHistory = await this.storage.getPriceHistory(symbol, period);
    const volumeHistory = await this.storage.getVolumeHistory(symbol, period);

    if (priceHistory.length < 20) {
      const defaultTrend: TrendAnalysis = {
        direction: 'sideways',
        strength: 50,
        confidence: 0,
        support: 0,
        resistance: 0,
        momentum: 'stable',
        volatility: 'medium'
      };
      this.setCachedResult(cacheKey, defaultTrend);
      return defaultTrend;
    }

    const currentPrice = priceHistory[priceHistory.length - 1];
    const sma20 = this.calculateSMA(priceHistory, 20);
    const sma50 = this.calculateSMA(priceHistory, 50);
    const ema12 = this.calculateEMA(priceHistory, 12);
    const ema26 = this.calculateEMA(priceHistory, 26);

    // Determine trend direction
    let direction: 'bullish' | 'bearish' | 'sideways' = 'sideways';
    let strength = 50;

    if (currentPrice > sma20 && sma20 > sma50 && ema12 > ema26) {
      direction = 'bullish';
      strength = Math.min(100, 60 + ((currentPrice - sma20) / sma20) * 1000);
    } else if (currentPrice < sma20 && sma20 < sma50 && ema12 < ema26) {
      direction = 'bearish';
      strength = Math.min(100, 60 + ((sma20 - currentPrice) / sma20) * 1000);
    }

    // Calculate support and resistance levels
    const recentPrices = priceHistory.slice(-50);
    const support = Math.min(...recentPrices);
    const resistance = Math.max(...recentPrices);

    // Analyze momentum
    const recentPriceChange = (currentPrice - priceHistory[priceHistory.length - 10]) / priceHistory[priceHistory.length - 10];
    const momentum = recentPriceChange > 0.02 ? 'increasing' : 
                    recentPriceChange < -0.02 ? 'decreasing' : 'stable';

    // Calculate volatility
    const volatility = this.calculateVolatility(priceHistory.slice(-20));
    const volatilityLevel = volatility < 0.02 ? 'low' : volatility > 0.05 ? 'high' : 'medium';

    // Calculate confidence based on various factors
    const volumeTrend = this.analyzeVolumeTrend(volumeHistory.slice(-20));
    const priceConsistency = this.calculateTrendConsistency(priceHistory.slice(-20));
    const confidence = Math.min(100, (priceConsistency * 0.6 + volumeTrend * 0.4) * 100);

    const trendAnalysis: TrendAnalysis = {
      direction,
      strength: Math.round(strength),
      confidence: Math.round(confidence),
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100,
      momentum,
      volatility: volatilityLevel
    };

    this.setCachedResult(cacheKey, trendAnalysis);
    return trendAnalysis;
  }

  /**
   * Generate trading signals based on technical analysis
   */
  async generateTradingSignal(symbol: string): Promise<MarketSignal> {
    const indicators = await this.calculateAdvancedIndicators(symbol);
    const trend = await this.analyzeTrend(symbol);
    const priceHistory = await this.storage.getPriceHistory(symbol, 50);
    const volumeHistory = await this.storage.getVolumeHistory(symbol, 20);

    const currentPrice = priceHistory[priceHistory.length - 1];
    const reasoning: string[] = [];
    let signalType: 'buy' | 'sell' | 'hold' = 'hold';
    let signalStrength = 0;
    let confidence = 0;

    // RSI Analysis
    const rsiSignal = indicators.rsi < 30 ? 'oversold' : 
                     indicators.rsi > 70 ? 'overbought' : 'neutral';
    
    if (rsiSignal === 'oversold') {
      signalStrength += 20;
      reasoning.push(`RSI (${indicators.rsi.toFixed(1)}) indicates oversold conditions`);
    } else if (rsiSignal === 'overbought') {
      signalStrength -= 20;
      reasoning.push(`RSI (${indicators.rsi.toFixed(1)}) indicates overbought conditions`);
    }

    // MACD Analysis
    const macdSignal = indicators.macd > 0 ? 'bullish' : 
                      indicators.macd < 0 ? 'bearish' : 'neutral';
    
    if (macdSignal === 'bullish') {
      signalStrength += 15;
      reasoning.push(`MACD (${indicators.macd.toFixed(4)}) shows bullish momentum`);
    } else if (macdSignal === 'bearish') {
      signalStrength -= 15;
      reasoning.push(`MACD (${indicators.macd.toFixed(4)}) shows bearish momentum`);
    }

    // Bollinger Bands Analysis
    const bollingerPosition = currentPrice > indicators.bollinger.upper ? 'upper' :
                             currentPrice < indicators.bollinger.lower ? 'lower' : 'middle';
    
    if (bollingerPosition === 'lower') {
      signalStrength += 10;
      reasoning.push('Price near lower Bollinger Band suggests potential bounce');
    } else if (bollingerPosition === 'upper') {
      signalStrength -= 10;
      reasoning.push('Price near upper Bollinger Band suggests potential pullback');
    }

    // Trend Analysis
    if (trend.direction === 'bullish' && trend.strength > 60) {
      signalStrength += 25;
      reasoning.push(`Strong bullish trend (strength: ${trend.strength})`);
    } else if (trend.direction === 'bearish' && trend.strength > 60) {
      signalStrength -= 25;
      reasoning.push(`Strong bearish trend (strength: ${trend.strength})`);
    }

    // Volume Analysis
    const volumeTrend = this.analyzeVolumeTrend(volumeHistory);
    const volumeSignal = volumeTrend > 0.1 ? 'increasing' : 
                        volumeTrend < -0.1 ? 'decreasing' : 'stable';
    
    if (volumeSignal === 'increasing' && signalStrength > 0) {
      signalStrength += 10;
      reasoning.push('Increasing volume supports the price movement');
    }

    // Determine final signal
    if (signalStrength > 30) {
      signalType = 'buy';
    } else if (signalStrength < -30) {
      signalType = 'sell';
    }

    // Calculate confidence based on multiple factors
    confidence = Math.min(100, Math.abs(signalStrength) + trend.confidence * 0.3);

    return {
      type: signalType,
      strength: Math.abs(signalStrength),
      confidence: Math.round(confidence),
      reasoning,
      indicators: {
        rsi: { value: indicators.rsi, signal: rsiSignal },
        macd: { value: indicators.macd, signal: macdSignal },
        bollinger: { 
          position: bollingerPosition, 
          signal: bollingerPosition === 'lower' ? 'potential buy' : 
                 bollingerPosition === 'upper' ? 'potential sell' : 'neutral'
        },
        volume: { 
          trend: volumeSignal, 
          signal: volumeSignal === 'increasing' ? 'supportive' : 'weak'
        }
      }
    };
  }

  /**
   * Detect price patterns (basic implementation)
   */
  async detectPricePatterns(symbol: string): Promise<PricePattern[]> {
    const priceHistory = await this.storage.getPriceHistory(symbol, 100);
    const patterns: PricePattern[] = [];

    if (priceHistory.length < 20) {
      return patterns;
    }

    // Simple pattern detection - can be expanded
    const recentPrices = priceHistory.slice(-20);
    const currentPrice = recentPrices[recentPrices.length - 1];
    
    // Double Bottom Pattern (simplified)
    const lows = this.findLocalMinima(recentPrices);
    if (lows.length >= 2) {
      const lastTwoLows = lows.slice(-2);
      const priceDiff = Math.abs(lastTwoLows[0].price - lastTwoLows[1].price) / lastTwoLows[0].price;
      
      if (priceDiff < 0.02) { // Within 2%
        patterns.push({
          name: 'Double Bottom',
          type: 'reversal',
          reliability: 70,
          target: currentPrice * 1.05,
          stopLoss: Math.min(lastTwoLows[0].price, lastTwoLows[1].price) * 0.98,
          timeframe: '1h-4h'
        });
      }
    }

    // Ascending Triangle (simplified)
    const highs = this.findLocalMaxima(recentPrices);
    if (highs.length >= 3) {
      const resistanceLevel = Math.max(...highs.map(h => h.price));
      const isAscending = this.isAscendingLows(recentPrices);
      
      if (isAscending && currentPrice > resistanceLevel * 0.98) {
        patterns.push({
          name: 'Ascending Triangle',
          type: 'continuation',
          reliability: 65,
          target: resistanceLevel * 1.03,
          stopLoss: currentPrice * 0.97,
          timeframe: '2h-6h'
        });
      }
    }

    return patterns;
  }

  /**
   * Calculate market correlation between symbols
   */
  async calculateCorrelation(symbol1: string, symbol2: string, period: number = 50): Promise<number> {
    const [prices1, prices2] = await Promise.all([
      this.storage.getPriceHistory(symbol1, period),
      this.storage.getPriceHistory(symbol2, period)
    ]);

    if (prices1.length < 10 || prices2.length < 10) {
      return 0;
    }

    const minLength = Math.min(prices1.length, prices2.length);
    const p1 = prices1.slice(-minLength);
    const p2 = prices2.slice(-minLength);

    return this.calculatePearsonCorrelation(p1, p2);
  }

  // Private helper methods

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    if (gains.length < period) return 50;

    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[], fast: number = 12, slow: number = 26, signal: number = 9): number {
    if (prices.length < slow) return 0;

    const fastEMA = this.calculateEMA(prices, fast);
    const slowEMA = this.calculateEMA(prices, slow);
    
    return fastEMA - slowEMA;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length === 0) {
      return 0;
    }
    
    if (prices.length < period) {
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }

    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
    upper: number;
    middle: number;
    lower: number;
  } {
    const sma = this.calculateSMA(prices, period);
    
    if (prices.length < period) {
      return { upper: sma, middle: sma, lower: sma };
    }

    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  private calculateStochastic(data: MarketData[], period: number = 14): { k: number; d: number } {
    if (data.length < period) {
      return { k: 50, d: 50 };
    }

    const recentData = data.slice(-period);
    const currentPrice = data[data.length - 1].price;
    
    // For simplified calculation, we'll use price as both high and low
    const high = Math.max(...recentData.map(d => d.price));
    const low = Math.min(...recentData.map(d => d.price));
    
    const k = ((currentPrice - low) / (high - low)) * 100;
    
    // Calculate %D as 3-period SMA of %K (simplified)
    const recentK = [k]; // In a real implementation, you'd track multiple %K values
    const d = recentK.reduce((sum, val) => sum + val, 0) / recentK.length;

    return { k: Math.round(k), d: Math.round(d) };
  }

  private calculateWilliamsR(data: MarketData[], period: number = 14): number {
    if (data.length < period) return -50;

    const recentData = data.slice(-period);
    const currentPrice = data[data.length - 1].price;
    
    const high = Math.max(...recentData.map(d => d.price));
    const low = Math.min(...recentData.map(d => d.price));
    
    return ((high - currentPrice) / (high - low)) * -100;
  }

  private calculateATR(data: MarketData[], period: number = 14): number {
    if (data.length < 2) return 0;

    const trueRanges: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];
      
      // Simplified TR calculation using price as high/low
      const tr = Math.abs(current.price - previous.price);
      trueRanges.push(tr);
    }

    if (trueRanges.length < period) {
      return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
    }

    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
  }

  private calculateOBV(prices: number[], volumes: number[]): number {
    if (prices.length < 2 || volumes.length < 2) return 0;

    let obv = 0;
    
    for (let i = 1; i < Math.min(prices.length, volumes.length); i++) {
      if (prices[i] > prices[i - 1]) {
        obv += volumes[i];
      } else if (prices[i] < prices[i - 1]) {
        obv -= volumes[i];
      }
      // If prices are equal, OBV remains unchanged
    }

    return obv;
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private analyzeVolumeTrend(volumes: number[]): number {
    if (volumes.length < 2) return 0;

    const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
    const secondHalf = volumes.slice(Math.floor(volumes.length / 2));

    const firstAvg = firstHalf.reduce((sum, vol) => sum + vol, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, vol) => sum + vol, 0) / secondHalf.length;

    return (secondAvg - firstAvg) / firstAvg;
  }

  private calculateTrendConsistency(prices: number[]): number {
    if (prices.length < 3) return 0;

    let consistentMoves = 0;
    let totalMoves = 0;

    for (let i = 2; i < prices.length; i++) {
      const move1 = prices[i - 1] - prices[i - 2];
      const move2 = prices[i] - prices[i - 1];
      
      if ((move1 > 0 && move2 > 0) || (move1 < 0 && move2 < 0)) {
        consistentMoves++;
      }
      totalMoves++;
    }

    return totalMoves > 0 ? consistentMoves / totalMoves : 0;
  }

  private findLocalMinima(prices: number[]): { index: number; price: number }[] {
    const minima: { index: number; price: number }[] = [];
    
    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] < prices[i - 1] && prices[i] < prices[i + 1]) {
        minima.push({ index: i, price: prices[i] });
      }
    }
    
    return minima;
  }

  private findLocalMaxima(prices: number[]): { index: number; price: number }[] {
    const maxima: { index: number; price: number }[] = [];
    
    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) {
        maxima.push({ index: i, price: prices[i] });
      }
    }
    
    return maxima;
  }

  private isAscendingLows(prices: number[]): boolean {
    const lows = this.findLocalMinima(prices);
    if (lows.length < 2) return false;

    for (let i = 1; i < lows.length; i++) {
      if (lows[i].price <= lows[i - 1].price) {
        return false;
      }
    }
    
    return true;
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);

    const sumX = xSlice.reduce((sum, val) => sum + val, 0);
    const sumY = ySlice.reduce((sum, val) => sum + val, 0);
    const sumXY = xSlice.reduce((sum, val, i) => sum + val * ySlice[i], 0);
    const sumX2 = xSlice.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = ySlice.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0 || isNaN(denominator)) return 0;
    
    const correlation = numerator / denominator;
    return isNaN(correlation) ? 0 : correlation;
  }

  private getCachedResult(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedResult(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}