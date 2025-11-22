// Market Data Processing Service Implementation
// Implements real-time market data collection, validation, and technical analysis

import { EventEmitter } from 'events';
import { BaseService, RateLimiter, CircuitBreaker } from '../base';
import { 
  MarketDataService as IMarketDataService,
  MarketData, 
  TechnicalIndicators,
  OrderBook,
  OrderBookLevel,
  GateExchangeService,
  ErrorHandler,
  NetworkError
} from '../../types';

interface MarketDataConfig {
  updateInterval: number; // milliseconds
  maxHistoryLength: number;
  enableRealTimeUpdates: boolean;
  tradingPairs: string[];
  technicalIndicatorsPeriods: {
    rsi: number;
    macd: {
      fast: number;
      slow: number;
      signal: number;
    };
    movingAverage: number;
  };
}

interface PriceHistory {
  symbol: string;
  prices: number[];
  volumes: number[];
  timestamps: number[];
  maxLength: number;
}

interface MarketDataCache {
  [symbol: string]: {
    data: MarketData;
    lastUpdate: number;
    priceHistory: PriceHistory;
  };
}

export class MarketDataService extends EventEmitter implements IMarketDataService {
  protected config: MarketDataConfig;
  protected errorHandler: ErrorHandler;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;
  private exchangeService: GateExchangeService;
  private marketDataCache: MarketDataCache = {};
  private subscriptions: Set<string> = new Set();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor(
    config: MarketDataConfig,
    exchangeService: GateExchangeService,
    errorHandler: ErrorHandler
  ) {
    super();
    
    this.config = config;
    this.errorHandler = errorHandler;
    this.exchangeService = exchangeService;
    
    // Rate limiter to ensure we don't exceed API limits
    // Conservative limit to work with Gate.io's 900 requests/minute
    this.rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
    this.circuitBreaker = new CircuitBreaker(3, 30000); // 3 failures, 30s recovery
    
    this.validateConfig();
  }

  private validateConfig(): void {
    this.validateRequired(this.config.updateInterval, 'Update interval');
    this.validateRequired(this.config.tradingPairs, 'Trading pairs');
    
    if (this.config.updateInterval < 1000) {
      throw new Error('Update interval must be at least 1000ms to meet 1-second requirement');
    }
    
    if (!Array.isArray(this.config.tradingPairs) || this.config.tradingPairs.length === 0) {
      throw new Error('At least one trading pair must be configured');
    }
  }

  /**
   * Subscribe to real-time market data for a trading pair
   * Implements market data streaming with 1-second update requirement
   */
  async subscribeToMarket(symbol: string): Promise<void> {
    if (this.subscriptions.has(symbol)) {
      console.log(`Already subscribed to ${symbol}`);
      return;
    }

    try {
      // Initialize price history for the symbol
      this.initializePriceHistory(symbol);
      
      // Fetch initial market data
      try {
        const initialData = await this.fetchMarketData(symbol);
        this.updateMarketDataCache(symbol, initialData);
      } catch (e) {
        this.errorHandler.logError(e as Error, `Initial market data fetch failed for ${symbol}`);
      }
      
      // Set up real-time updates
      if (this.config.enableRealTimeUpdates) {
        await this.startRealTimeUpdates(symbol);
      }
      
      this.subscriptions.add(symbol);
      this.emit('subscribed', symbol);
      
      console.log(`Successfully subscribed to market data for ${symbol}`);
    } catch (error) {
      this.errorHandler.logError(error as Error, `Subscribe to ${symbol} failed, scheduling retry`);
      setTimeout(() => {
        this.subscribeToMarket(symbol).catch(() => {});
      }, 5000);
    }
  }

  /**
   * Unsubscribe from market data updates for a symbol
   */
  async unsubscribeFromMarket(symbol: string): Promise<void> {
    if (!this.subscriptions.has(symbol)) {
      return;
    }

    // Clear update interval
    const interval = this.updateIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(symbol);
    }

    // Remove from subscriptions and cache
    this.subscriptions.delete(symbol);
    delete this.marketDataCache[symbol];
    
    this.emit('unsubscribed', symbol);
    console.log(`Unsubscribed from market data for ${symbol}`);
  }

  /**
   * Process incoming tick data and update market state within 1-second requirement
   */
  async processTickData(tick: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!tick || !tick.symbol) {
        throw new Error('Invalid tick data: missing symbol');
      }

      const symbol = tick.symbol;
      
      // Validate tick data integrity
      if (!this.validateTickData(tick)) {
        throw new Error(`Invalid tick data for ${symbol}`);
      }

      // Update price history
      this.updatePriceHistory(symbol, tick.price, tick.volume, tick.timestamp);
      
      // Calculate technical indicators with updated history
      const indicators = this.calculateIndicators(this.getPriceHistory(symbol));
      
      // Create updated market data
      const marketData: MarketData = {
        symbol,
        timestamp: tick.timestamp || Date.now(),
        price: tick.price,
        volume: tick.volume,
        orderBook: tick.orderBook || this.getLastOrderBook(symbol),
        indicators
      };

      // Validate complete market data
      if (!this.validateDataIntegrity(marketData)) {
        throw new Error(`Market data validation failed for ${symbol}`);
      }

      // Update cache and emit event
      this.updateMarketDataCache(symbol, marketData);
      this.emit('marketDataUpdate', marketData);
      
      // Ensure processing completes within 1-second requirement
      const processingTime = Date.now() - startTime;
      if (processingTime > 1000) {
        console.warn(`Market data processing for ${symbol} took ${processingTime}ms (exceeds 1-second requirement)`);
      }
      
    } catch (error) {
      this.errorHandler.logError(error as Error, `Process tick data`);
      throw error;
    }
  }

  /**
   * Calculate technical indicators (RSI, MACD, MA) from price history
   */
  calculateIndicators(history: number[]): TechnicalIndicators {
    if (history.length === 0) {
      return { rsi: 50, macd: 0, movingAverage: 0 };
    }

    const periods = this.config.technicalIndicatorsPeriods;
    
    return {
      rsi: this.calculateRSI(history, periods.rsi),
      macd: this.calculateMACD(history, periods.macd.fast, periods.macd.slow, periods.macd.signal),
      movingAverage: this.calculateMovingAverage(history, periods.movingAverage)
    };
  }

  /**
   * Validate market data integrity and completeness
   */
  validateDataIntegrity(data: MarketData): boolean {
    try {
      // Check required fields
      if (!data.symbol || typeof data.symbol !== 'string') {
        console.error('Invalid symbol in market data');
        return false;
      }

      if (!data.timestamp || typeof data.timestamp !== 'number' || data.timestamp <= 0) {
        console.error('Invalid timestamp in market data');
        return false;
      }

      if (!data.price || typeof data.price !== 'number' || data.price <= 0) {
        console.error('Invalid price in market data');
        return false;
      }

      if (data.volume !== undefined && (typeof data.volume !== 'number' || data.volume < 0)) {
        console.error('Invalid volume in market data');
        return false;
      }

      // Validate order book if present
      if (data.orderBook) {
        if (!this.validateOrderBook(data.orderBook)) {
          console.error('Invalid order book in market data');
          return false;
        }
      }

      // Validate technical indicators
      if (data.indicators) {
        if (!this.validateTechnicalIndicators(data.indicators)) {
          console.error('Invalid technical indicators in market data');
          return false;
        }
      }

      // Check for reasonable price ranges (basic sanity check)
      if (data.price > 1000000 || data.price < 0.000001) {
        console.warn(`Unusual price detected for ${data.symbol}: ${data.price}`);
      }

      // Check timestamp is not too far in the future or past
      const now = Date.now();
      const timeDiff = Math.abs(now - data.timestamp);
      if (timeDiff > 300000) { // 5 minutes
        console.warn(`Market data timestamp for ${data.symbol} is ${timeDiff}ms from current time`);
      }

      return true;
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Validate market data integrity');
      return false;
    }
  }

  /**
   * Get current market data for a symbol
   */
  getMarketData(symbol: string): MarketData | null {
    const cached = this.marketDataCache[symbol];
    return cached ? cached.data : null;
  }

  /**
   * Get all subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Get price history for a symbol
   */
  getPriceHistory(symbol: string): number[] {
    const cached = this.marketDataCache[symbol];
    return cached ? cached.priceHistory.prices : [];
  }

  /**
   * Start real-time market data collection for all configured trading pairs
   */
  async startRealTimeCollection(): Promise<void> {
    if (this.isRunning) {
      console.log('Market data collection is already running');
      return;
    }

    try {
      // Subscribe to all configured trading pairs
      for (const symbol of this.config.tradingPairs) {
        this.subscribeToMarket(symbol).catch(() => {});
      }

      this.isRunning = true;
      this.emit('collectionStarted');
      console.log('Real-time market data collection started');
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Start real-time collection (continuing despite errors)');
    }
  }

  /**
   * Stop real-time market data collection
   */
  async stopRealTimeCollection(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Unsubscribe from all symbols
    const symbols = Array.from(this.subscriptions);
    for (const symbol of symbols) {
      await this.unsubscribeFromMarket(symbol);
    }

    this.isRunning = false;
    this.emit('collectionStopped');
    console.log('Real-time market data collection stopped');
  }

  /**
   * Add event listener for market data updates
   */
  onMarketDataUpdate(callback: (data: MarketData) => void): void {
    this.eventEmitter.on('marketDataUpdate', callback);
  }

  /**
   * Remove event listener
   */
  removeMarketDataListener(callback: (data: MarketData) => void): void {
    this.eventEmitter.removeListener('marketDataUpdate', callback);
  }

  private async startRealTimeUpdates(symbol: string): Promise<void> {
    const interval = setInterval(async () => {
      try {
        await this.rateLimiter.checkLimit();
        
        const marketData = await this.circuitBreaker.execute(async () => {
          return await this.fetchMarketData(symbol);
        });

        // Process as tick data to trigger all validation and processing
        await this.processTickData({
          symbol,
          price: marketData.price,
          volume: marketData.volume,
          timestamp: marketData.timestamp,
          orderBook: marketData.orderBook
        });

      } catch (error) {
        this.errorHandler.logError(error as Error, `Real-time update for ${symbol}`);
        
        // If we have too many consecutive failures, consider unsubscribing
        if (this.circuitBreaker.getState() === 'OPEN') {
          console.warn(`Circuit breaker open for ${symbol}, pausing updates`);
        }
      }
    }, this.config.updateInterval);

    this.updateIntervals.set(symbol, interval);
  }

  private async fetchMarketData(symbol: string): Promise<MarketData> {
    return await this.exchangeService.getMarketData(symbol);
  }

  private initializePriceHistory(symbol: string): void {
    if (!this.marketDataCache[symbol]) {
      this.marketDataCache[symbol] = {
        data: {} as MarketData,
        lastUpdate: 0,
        priceHistory: {
          symbol,
          prices: [],
          volumes: [],
          timestamps: [],
          maxLength: this.config.maxHistoryLength || 200
        }
      };
    }
  }

  private updateMarketDataCache(symbol: string, data: MarketData): void {
    if (!this.marketDataCache[symbol]) {
      this.initializePriceHistory(symbol);
    }

    this.marketDataCache[symbol].data = data;
    this.marketDataCache[symbol].lastUpdate = Date.now();
  }

  private updatePriceHistory(symbol: string, price: number, volume: number, timestamp: number): void {
    const cached = this.marketDataCache[symbol];
    if (!cached) {
      this.initializePriceHistory(symbol);
      return this.updatePriceHistory(symbol, price, volume, timestamp);
    }

    const history = cached.priceHistory;
    
    // Add new data point
    history.prices.push(price);
    history.volumes.push(volume);
    history.timestamps.push(timestamp);

    // Maintain maximum length
    if (history.prices.length > history.maxLength) {
      history.prices.shift();
      history.volumes.shift();
      history.timestamps.shift();
    }
  }

  private validateTickData(tick: any): boolean {
    return (
      tick &&
      typeof tick.symbol === 'string' &&
      typeof tick.price === 'number' &&
      tick.price > 0 &&
      (tick.volume === undefined || (typeof tick.volume === 'number' && tick.volume >= 0)) &&
      (tick.timestamp === undefined || (typeof tick.timestamp === 'number' && tick.timestamp > 0))
    );
  }

  private validateOrderBook(orderBook: OrderBook): boolean {
    if (!orderBook || !Array.isArray(orderBook.bids) || !Array.isArray(orderBook.asks)) {
      return false;
    }

    // Validate bid levels
    for (const bid of orderBook.bids) {
      if (!bid || typeof bid.price !== 'number' || typeof bid.amount !== 'number' ||
          bid.price <= 0 || bid.amount <= 0) {
        return false;
      }
    }

    // Validate ask levels
    for (const ask of orderBook.asks) {
      if (!ask || typeof ask.price !== 'number' || typeof ask.amount !== 'number' ||
          ask.price <= 0 || ask.amount <= 0) {
        return false;
      }
    }

    // Check that bids are sorted descending and asks ascending
    for (let i = 1; i < orderBook.bids.length; i++) {
      if (orderBook.bids[i].price > orderBook.bids[i - 1].price) {
        return false; // Bids should be in descending order
      }
    }

    for (let i = 1; i < orderBook.asks.length; i++) {
      if (orderBook.asks[i].price < orderBook.asks[i - 1].price) {
        return false; // Asks should be in ascending order
      }
    }

    return true;
  }

  private validateTechnicalIndicators(indicators: TechnicalIndicators): boolean {
    return (
      indicators &&
      typeof indicators.rsi === 'number' &&
      indicators.rsi >= 0 && indicators.rsi <= 100 &&
      typeof indicators.macd === 'number' &&
      typeof indicators.movingAverage === 'number' &&
      indicators.movingAverage > 0
    );
  }

  private getLastOrderBook(symbol: string): OrderBook | undefined {
    const cached = this.marketDataCache[symbol];
    return cached?.data?.orderBook;
  }

  /**
   * Calculate RSI (Relative Strength Index) using standard 14-period calculation
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) {
      // Not enough data for RSI calculation, return neutral value
      return 50;
    }

    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    if (gains.length < period) {
      return 50;
    }

    // Calculate average gains and losses
    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

    if (avgLoss === 0) {
      return 100; // No losses, RSI = 100
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return Math.round(rsi * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): number {
    if (prices.length < slowPeriod) {
      return 0; // Not enough data
    }

    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    if (fastEMA === null || slowEMA === null) {
      return 0;
    }

    const macdLine = fastEMA - slowEMA;
    return Math.round(macdLine * 100000) / 100000; // Round to 5 decimal places
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateMovingAverage(prices: number[], period: number): number {
    if (prices.length < period) {
      // If not enough data, return average of available prices
      return prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
    }

    const recentPrices = prices.slice(-period);
    const sum = recentPrices.reduce((sum, price) => sum + price, 0);
    return Math.round((sum / period) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  private calculateEMA(prices: number[], period: number): number | null {
    if (prices.length < period) {
      return null;
    }

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  // Helper methods from BaseService
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected validateRequired(value: any, fieldName: string): void {
    if (!value) {
      throw new Error(`${fieldName} is required`);
    }
  }
}