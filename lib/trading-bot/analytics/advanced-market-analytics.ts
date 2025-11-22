/**
 * Advanced Market Analytics for Trading Bot
 * Implements CVD, Volume Analysis, Chart Patterns, and VRVP
 *
 * Focus: ETH/USDT on Binance Futures
 */

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVolume?: number;  // Volume dari buy orders
  sellVolume?: number; // Volume dari sell orders
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface CVDAnalysis {
  cvd: number;              // Cumulative Volume Delta
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  pressure: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  magnitude: number;        // Besar tekanan (0-100)
}

export interface VolumeAnalysis {
  currentVolume: number;
  averageVolume: number;
  volumeRatio: number;      // Current / Average
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
  isSurge: boolean;         // Volume spike detected
}

export interface ChartPattern {
  type: 'BEARISH_MOMENTUM' | 'BULLISH_MOMENTUM' | 'CONSOLIDATION' | 'REVERSAL';
  confidence: number;       // 0-100
  priceChange: number;      // Persentase perubahan
  momentum: 'STRONG' | 'MODERATE' | 'WEAK';
  timeframe: string;        // '1h', '4h', etc
}

export interface VRVPAnalysis {
  supportLevels: number[];
  resistanceLevels: number[];
  highVolumeNodes: Array<{ price: number; volume: number }>;
  lowVolumeZones: Array<{ priceStart: number; priceEnd: number }>;
  liquidityZones: Array<{
    price: number;
    volume: number;
    type: 'SUPPORT' | 'RESISTANCE';
    isHunterZone: boolean;  // Area likuiditas besar yang berbahaya
  }>;
}

export interface TradingSignal {
  action: 'LONG' | 'SHORT' | 'HOLD' | 'EXIT';
  confidence: number;
  reasoning: string[];
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface AdvancedMarketAnalysis {
  symbol: string;
  timestamp: number;
  cvd: CVDAnalysis;
  volume: VolumeAnalysis;
  pattern: ChartPattern;
  vrvp: VRVPAnalysis;
  signal: TradingSignal;
}

/**
 * Calculate Cumulative Volume Delta (CVD)
 */
export function calculateCVD(candles: CandleData[]): CVDAnalysis {
  let cumulativeDelta = 0;

  for (const candle of candles) {
    // Estimasi buy/sell volume berdasarkan harga close vs open
    const buyVolume = candle.buyVolume || (candle.close > candle.open ? candle.volume : candle.volume * 0.3);
    const sellVolume = candle.sellVolume || (candle.close < candle.open ? candle.volume : candle.volume * 0.3);

    const delta = buyVolume - sellVolume;
    cumulativeDelta += delta;
  }

  // Analisis trend berdasarkan CVD
  const recentCandles = candles.slice(-10);
  let recentDelta = 0;
  for (const candle of recentCandles) {
    const buyVolume = candle.buyVolume || (candle.close > candle.open ? candle.volume : candle.volume * 0.3);
    const sellVolume = candle.sellVolume || (candle.close < candle.open ? candle.volume : candle.volume * 0.3);
    recentDelta += (buyVolume - sellVolume);
  }

  // Tentukan trend dan pressure
  let trend: CVDAnalysis['trend'] = 'NEUTRAL';
  let pressure: CVDAnalysis['pressure'] = 'NEUTRAL';

  if (cumulativeDelta < -1000000000) {  // CVD minus besar
    trend = 'BEARISH';
    pressure = 'STRONG_SELL';
  } else if (cumulativeDelta < -500000000) {
    trend = 'BEARISH';
    pressure = 'SELL';
  } else if (cumulativeDelta > 1000000000) {
    trend = 'BULLISH';
    pressure = 'STRONG_BUY';
  } else if (cumulativeDelta > 500000000) {
    trend = 'BULLISH';
    pressure = 'BUY';
  }

  const magnitude = Math.min(Math.abs(cumulativeDelta) / 10000000, 100);

  return {
    cvd: cumulativeDelta,
    trend,
    pressure,
    magnitude
  };
}

/**
 * Analyze Volume
 */
export function analyzeVolume(candles: CandleData[]): VolumeAnalysis {
  const currentVolume = candles[candles.length - 1].volume;

  // Calculate average volume (exclude current candle)
  const historicalVolumes = candles.slice(0, -1).map(c => c.volume);
  const averageVolume = historicalVolumes.reduce((a, b) => a + b, 0) / historicalVolumes.length;

  const volumeRatio = currentVolume / averageVolume;

  let significance: VolumeAnalysis['significance'] = 'LOW';
  let isSurge = false;

  // Volume besar (323K dalam contoh user) menandakan aktivitas tinggi
  if (volumeRatio > 2.0) {
    significance = 'HIGH';
    isSurge = true;
  } else if (volumeRatio > 1.5) {
    significance = 'HIGH';
  } else if (volumeRatio > 1.2) {
    significance = 'MEDIUM';
  }

  return {
    currentVolume,
    averageVolume,
    volumeRatio,
    significance,
    isSurge
  };
}

/**
 * Detect Chart Pattern
 */
export function detectChartPattern(candles: CandleData[], timeframe: string = '1h'): ChartPattern {
  const latestCandle = candles[candles.length - 1];
  const priceChange = ((latestCandle.close - latestCandle.open) / latestCandle.open) * 100;

  let type: ChartPattern['type'] = 'CONSOLIDATION';
  let confidence = 50;
  let momentum: ChartPattern['momentum'] = 'WEAK';

  // Penurunan 2.12% dalam satu candle TF 1 jam = momentum bearish signifikan
  if (priceChange < -2.0) {
    type = 'BEARISH_MOMENTUM';
    confidence = 85;
    momentum = 'STRONG';
  } else if (priceChange < -1.0) {
    type = 'BEARISH_MOMENTUM';
    confidence = 70;
    momentum = 'MODERATE';
  } else if (priceChange > 2.0) {
    type = 'BULLISH_MOMENTUM';
    confidence = 85;
    momentum = 'STRONG';
  } else if (priceChange > 1.0) {
    type = 'BULLISH_MOMENTUM';
    confidence = 70;
    momentum = 'MODERATE';
  }

  // Check for reversal patterns
  if (candles.length >= 3) {
    const prev1 = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];

    // Bullish reversal: 2 candle merah diikuti 1 candle hijau besar
    if (prev2.close < prev2.open && prev1.close < prev1.open && latestCandle.close > latestCandle.open) {
      const reversalStrength = ((latestCandle.close - latestCandle.open) / latestCandle.open) * 100;
      if (reversalStrength > 1.5) {
        type = 'REVERSAL';
        confidence = 75;
      }
    }

    // Bearish reversal: 2 candle hijau diikuti 1 candle merah besar
    if (prev2.close > prev2.open && prev1.close > prev1.open && latestCandle.close < latestCandle.open) {
      const reversalStrength = Math.abs(((latestCandle.close - latestCandle.open) / latestCandle.open) * 100);
      if (reversalStrength > 1.5) {
        type = 'REVERSAL';
        confidence = 75;
      }
    }
  }

  return {
    type,
    confidence,
    priceChange,
    momentum,
    timeframe
  };
}

/**
 * Analyze Order Book for VRVP and Liquidity Zones
 */
export function analyzeVRVP(
  orderBook: OrderBookData,
  currentPrice: number,
  historicalVolume: Array<{ price: number; volume: number }>
): VRVPAnalysis {
  const supportLevels: number[] = [];
  const resistanceLevels: number[] = [];
  const highVolumeNodes: Array<{ price: number; volume: number }> = [];
  const lowVolumeZones: Array<{ priceStart: number; priceEnd: number }> = [];
  const liquidityZones: VRVPAnalysis['liquidityZones'] = [];

  // Analyze bids for support levels
  const topBids = orderBook.bids.slice(0, 20).sort((a, b) => b.quantity - a.quantity);
  for (let i = 0; i < Math.min(5, topBids.length); i++) {
    const level = topBids[i];
    supportLevels.push(level.price);

    // Deteksi hunter zone - area likuiditas sangat besar yang berbahaya
    const isHunterZone = level.quantity > (orderBook.bids[0]?.quantity || 0) * 3;

    liquidityZones.push({
      price: level.price,
      volume: level.quantity,
      type: 'SUPPORT',
      isHunterZone
    });
  }

  // Analyze asks for resistance levels
  const topAsks = orderBook.asks.slice(0, 20).sort((a, b) => b.quantity - a.quantity);
  for (let i = 0; i < Math.min(5, topAsks.length); i++) {
    const level = topAsks[i];
    resistanceLevels.push(level.price);

    const isHunterZone = level.quantity > (orderBook.asks[0]?.quantity || 0) * 3;

    liquidityZones.push({
      price: level.price,
      volume: level.quantity,
      type: 'RESISTANCE',
      isHunterZone
    });
  }

  // Analyze historical volume for high volume nodes
  const sortedHistoricalVolume = [...historicalVolume].sort((a, b) => b.volume - a.volume);
  for (let i = 0; i < Math.min(10, sortedHistoricalVolume.length); i++) {
    highVolumeNodes.push(sortedHistoricalVolume[i]);
  }

  // Detect low volume zones
  // Group prices into ranges and find gaps
  const priceRanges = new Map<string, number>();
  for (const vol of historicalVolume) {
    const range = Math.floor(vol.price / 10) * 10;
    priceRanges.set(range.toString(), (priceRanges.get(range.toString()) || 0) + vol.volume);
  }

  const sortedRanges = Array.from(priceRanges.entries()).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
  for (let i = 0; i < sortedRanges.length - 1; i++) {
    const currentRange = parseFloat(sortedRanges[i][0]);
    const currentVolume = sortedRanges[i][1];
    const avgVolume = historicalVolume.reduce((sum, v) => sum + v.volume, 0) / historicalVolume.length;

    if (currentVolume < avgVolume * 0.3) {
      lowVolumeZones.push({
        priceStart: currentRange,
        priceEnd: currentRange + 10
      });
    }
  }

  return {
    supportLevels: supportLevels.sort((a, b) => b - a),
    resistanceLevels: resistanceLevels.sort((a, b) => a - b),
    highVolumeNodes,
    lowVolumeZones,
    liquidityZones
  };
}

/**
 * Generate Trading Signal based on all analytics
 */
export function generateTradingSignal(
  cvd: CVDAnalysis,
  volume: VolumeAnalysis,
  pattern: ChartPattern,
  vrvp: VRVPAnalysis,
  currentPrice: number
): TradingSignal {
  const reasoning: string[] = [];
  let action: TradingSignal['action'] = 'HOLD';
  let confidence = 50;
  let riskLevel: TradingSignal['riskLevel'] = 'MEDIUM';

  // ===== RULE 1: Trend Bearish 1 jam → bot prioritas short =====
  if (pattern.type === 'BEARISH_MOMENTUM') {
    action = 'SHORT';
    confidence += 20;
    reasoning.push(`Bearish momentum detected with ${pattern.priceChange.toFixed(2)}% drop`);
  } else if (pattern.type === 'BULLISH_MOMENTUM') {
    action = 'LONG';
    confidence += 20;
    reasoning.push(`Bullish momentum detected with ${pattern.priceChange.toFixed(2)}% rise`);
  }

  // ===== RULE 2: Volume sebagai filter signal =====
  if (volume.significance === 'LOW') {
    action = 'HOLD';
    confidence = 30;
    reasoning.push('Volume too low - avoiding false signals');
    riskLevel = 'HIGH';
  } else if (volume.isSurge) {
    confidence += 15;
    reasoning.push(`High volume surge detected (${volume.volumeRatio.toFixed(2)}x average)`);
  }

  // ===== RULE 3: CVD negatif ekstrem =====
  if (cvd.pressure === 'STRONG_SELL') {
    if (action === 'SHORT') {
      confidence += 25;
      reasoning.push(`Strong sell pressure with CVD: ${(cvd.cvd / 1000000000).toFixed(2)}B`);
    } else {
      action = 'SHORT';
      confidence = 70;
      reasoning.push(`Extreme negative CVD detected: ${(cvd.cvd / 1000000000).toFixed(2)}B`);
    }
  } else if (cvd.pressure === 'STRONG_BUY') {
    if (action === 'LONG') {
      confidence += 25;
      reasoning.push(`Strong buy pressure with CVD: ${(cvd.cvd / 1000000000).toFixed(2)}B`);
    } else {
      action = 'LONG';
      confidence = 70;
      reasoning.push(`Extreme positive CVD detected: ${(cvd.cvd / 1000000000).toFixed(2)}B`);
    }
  }

  // ===== RULE 4: Check hunter zones - AVOID! =====
  const nearHunterZone = vrvp.liquidityZones.some(zone =>
    zone.isHunterZone && Math.abs(zone.price - currentPrice) / currentPrice < 0.01
  );

  if (nearHunterZone) {
    action = 'HOLD';
    confidence = 20;
    reasoning.push('Near hunter zone - high liquidity trap detected, avoiding entry');
    riskLevel = 'EXTREME';
  }

  // ===== RULE 5: Konfirmasi konsisten untuk entry =====
  const isConsistent = (
    (action === 'SHORT' && cvd.trend === 'BEARISH' && pattern.type === 'BEARISH_MOMENTUM') ||
    (action === 'LONG' && cvd.trend === 'BULLISH' && pattern.type === 'BULLISH_MOMENTUM')
  );

  if (isConsistent && volume.significance !== 'LOW') {
    confidence = Math.min(confidence + 15, 95);
    reasoning.push('All indicators aligned - high probability setup');
    riskLevel = 'LOW';
  }

  // ===== SET STOP LOSS & TAKE PROFIT =====
  let stopLoss: number | undefined;
  let takeProfit: number | undefined;

  if (action === 'SHORT') {
    // SL di atas High candle terakhir
    const highestHigh = Math.max(...[currentPrice * 1.02]); // +2% dari current price
    stopLoss = highestHigh;

    // TP di support berikutnya menurut VRVP
    const nearestSupport = vrvp.supportLevels.find(s => s < currentPrice);
    takeProfit = nearestSupport || currentPrice * 0.97; // Default -3%
  } else if (action === 'LONG') {
    // SL di bawah Low candle terakhir
    const lowestLow = currentPrice * 0.98; // -2% dari current price
    stopLoss = lowestLow;

    // TP di resistance berikutnya menurut VRVP
    const nearestResistance = vrvp.resistanceLevels.find(r => r > currentPrice);
    takeProfit = nearestResistance || currentPrice * 1.03; // Default +3%
  }

  // ===== RISK ASSESSMENT =====
  if (confidence < 50) {
    riskLevel = 'HIGH';
  } else if (confidence < 70) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return {
    action,
    confidence: Math.min(confidence, 95),
    reasoning,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit,
    riskLevel
  };
}

/**
 * Main function to perform complete advanced market analysis
 */
export function performAdvancedAnalysis(
  symbol: string,
  candles: CandleData[],
  orderBook: OrderBookData,
  historicalVolume: Array<{ price: number; volume: number }>,
  timeframe: string = '1h'
): AdvancedMarketAnalysis {
  const currentPrice = candles[candles.length - 1].close;

  // Perform all analyses
  const cvd = calculateCVD(candles);
  const volume = analyzeVolume(candles);
  const pattern = detectChartPattern(candles, timeframe);
  const vrvp = analyzeVRVP(orderBook, currentPrice, historicalVolume);
  const signal = generateTradingSignal(cvd, volume, pattern, vrvp, currentPrice);

  return {
    symbol,
    timestamp: Date.now(),
    cvd,
    volume,
    pattern,
    vrvp,
    signal
  };
}
