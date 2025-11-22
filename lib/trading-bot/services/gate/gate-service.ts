// Gate.io Exchange Service Implementation
// Implements API key/secret authentication, HTTP client with proper headers and signing,
// and rate limiting with exponential backoff retry logic

import crypto from 'crypto';
import { BaseService, RateLimiter, CircuitBreaker } from '../base';
import { getProxyDispatcher } from '../../../utils/proxy-dispatcher'
import { 
  GateConfig, 
  GateExchangeService, 
  MarketData, 
  TradeExecution, 
  TradingPosition,
  OrderBook,
  OrderBookLevel,
  TechnicalIndicators,
  GateError,
  ErrorHandler 
} from '../../types';

interface GateApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface GateOrderBookResponse {
  bids: [string, string][];
  asks: [string, string][];
}

interface GateTickerResponse {
  currency_pair: string;
  last: string;
  lowest_ask: string;
  highest_bid: string;
  change_percentage: string;
  base_volume: string;
  quote_volume: string;
  high_24h: string;
  low_24h: string;
}

interface GateAccountBalance {
  currency: string;
  available: string;
  locked: string;
}

interface GateOrderResponse {
  id: string;
  text: string;
  currency_pair: string;
  type: string;
  account: string;
  side: 'buy' | 'sell';
  amount: string;
  price: string;
  time_in_force: string;
  iceberg: string;
  auto_repay: boolean;
  auto_borrow: boolean;
  left: string;
  filled_total: string;
  fee: string;
  fee_currency: string;
  point_fee: string;
  gt_fee: string;
  gt_maker_fee: string;
  gt_taker_fee: string;
  gt_discount: boolean;
  rebated_fee: string;
  rebated_fee_currency: string;
  create_time: string;
  update_time: string;
  status: 'open' | 'closed' | 'cancelled';
  finish_as: string;
}

export class GateService extends BaseService implements GateExchangeService {
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;
  private authenticated: boolean = false;
  private maxRetries: number;
  private baseDelay: number;

  constructor(config: GateConfig, errorHandler: ErrorHandler, options?: { maxRetries?: number; baseDelay?: number }) {
    super(config, errorHandler);
    
    // Gate.io rate limits: 900 requests per minute for spot trading
    this.rateLimiter = new RateLimiter(900, 60000);
    this.circuitBreaker = new CircuitBreaker(5, 60000);
    
    // Allow configurable retry parameters for testing
    this.maxRetries = options?.maxRetries ?? 3;
    this.baseDelay = options?.baseDelay ?? 1000;
    
    this.validateConfig();
  }

  private validateConfig(): void {
    this.validateRequired(this.config.apiKey, 'Gate.io API Key');
    this.validateRequired(this.config.apiSecret, 'Gate.io API Secret');
    this.validateRequired(this.config.baseUrl, 'Gate.io Base URL');
  }

  async authenticate(): Promise<boolean> {
    try {
      // Test authentication by fetching account balance
      await this.getAccountBalance();
      this.authenticated = true;
      return true;
    } catch (error) {
      const gateError: GateError = {
        name: 'GateAuthenticationError',
        message: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'AUTH_FAILED',
        statusCode: error instanceof Error && 'status' in error ? (error as any).status : undefined
      };
      
      this.errorHandler.handleGateError(gateError);
      this.authenticated = false;
      return false;
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    await this.ensureAuthenticated();
    
    const currencyPair = this.formatSymbol(symbol);
    
    try {
      // Fetch ticker data, order book with 20+ levels depth, and trading volume data
      const [tickerData, orderBookData] = await Promise.all([
        this.getTicker(currencyPair),
        this.getOrderBook(currencyPair, 50) // Fetch 50 levels to ensure 20+ depth
      ]);

      const price = parseFloat(tickerData.last);
      const volume = parseFloat(tickerData.base_volume);
      const quoteVolume = parseFloat(tickerData.quote_volume);
      
      // Convert Gate.io order book format to our format with minimum 20 levels
      const orderBook: OrderBook = {
        bids: orderBookData.bids.slice(0, Math.max(20, orderBookData.bids.length)).map(([price, amount]): OrderBookLevel => ({
          price: parseFloat(price),
          amount: parseFloat(amount)
        })),
        asks: orderBookData.asks.slice(0, Math.max(20, orderBookData.asks.length)).map(([price, amount]): OrderBookLevel => ({
          price: parseFloat(price),
          amount: parseFloat(amount)
        }))
      };

      // Calculate market trend indicators from ticker data
      const changePercentage = parseFloat(tickerData.change_percentage);
      const high24h = parseFloat(tickerData.high_24h);
      const low24h = parseFloat(tickerData.low_24h);
      
      // Calculate basic technical indicators using available data
      const indicators: TechnicalIndicators = {
        rsi: this.calculateRSIFromPrice(price, high24h, low24h), // Simplified RSI calculation
        macd: changePercentage, // Use change percentage as MACD proxy
        movingAverage: (high24h + low24h + price) / 3 // Simple 3-point average
      };

      return {
        symbol,
        timestamp: Date.now(),
        price,
        volume,
        orderBook,
        indicators
      };
    } catch (error) {
      const gateError: GateError = {
        name: 'GateMarketDataError',
        message: `Failed to fetch market data for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'MARKET_DATA_FAILED',
        statusCode: error instanceof Error && 'status' in error ? (error as any).status : undefined
      };
      
      this.errorHandler.handleGateError(gateError);
      throw gateError;
    }
  }

  /**
   * Get real-time price data for multiple trading pairs
   */
  async getRealTimePrices(symbols: string[]): Promise<{ [symbol: string]: number }> {
    await this.rateLimiter.checkLimit();
    
    const prices: { [symbol: string]: number } = {};
    
    // Fetch all tickers at once for efficiency
    const currencyPairs = symbols.map(symbol => this.formatSymbol(symbol));
    
    try {
      const response = await this.makeRequest<GateTickerResponse[]>(
        'GET',
        '/api/v4/spot/tickers'
      );

      if (response.data) {
        const tickerMap = new Map<string, GateTickerResponse>();
        response.data.forEach(ticker => {
          tickerMap.set(ticker.currency_pair, ticker);
        });

        symbols.forEach(symbol => {
          const currencyPair = this.formatSymbol(symbol);
          const ticker = tickerMap.get(currencyPair);
          if (ticker) {
            prices[symbol] = parseFloat(ticker.last);
          }
        });
      }

      return prices;
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Get real-time prices');
      throw error;
    }
  }

  /**
   * Get trading volume and market trend data for a symbol
   */
  async getMarketTrendData(symbol: string): Promise<{
    volume24h: number;
    quoteVolume24h: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    high24h: number;
    low24h: number;
    vwap: number;
  }> {
    const currencyPair = this.formatSymbol(symbol);
    const tickerData = await this.getTicker(currencyPair);

    const volume24h = parseFloat(tickerData.base_volume);
    const quoteVolume24h = parseFloat(tickerData.quote_volume);
    const currentPrice = parseFloat(tickerData.last);
    const high24h = parseFloat(tickerData.high_24h);
    const low24h = parseFloat(tickerData.low_24h);
    const priceChangePercent24h = parseFloat(tickerData.change_percentage);
    
    // Calculate price change in absolute terms
    const priceChange24h = (currentPrice * priceChangePercent24h) / 100;
    
    // Calculate Volume Weighted Average Price (VWAP) approximation
    const vwap = quoteVolume24h > 0 ? quoteVolume24h / volume24h : currentPrice;

    return {
      volume24h,
      quoteVolume24h,
      priceChange24h,
      priceChangePercent24h,
      high24h,
      low24h,
      vwap
    };
  }

  /**
   * Get detailed order book with specified depth (minimum 20 levels)
   */
  async getDetailedOrderBook(symbol: string, depth: number = 20): Promise<OrderBook> {
    const currencyPair = this.formatSymbol(symbol);
    const minDepth = Math.max(depth, 20); // Ensure minimum 20 levels
    
    const orderBookData = await this.getOrderBook(currencyPair, minDepth);
    
    return {
      bids: orderBookData.bids.map(([price, amount]): OrderBookLevel => ({
        price: parseFloat(price),
        amount: parseFloat(amount)
      })),
      asks: orderBookData.asks.map(([price, amount]): OrderBookLevel => ({
        price: parseFloat(price),
        amount: parseFloat(amount)
      }))
    };
  }

  async getAccountBalance(): Promise<any> {
    await this.rateLimiter.checkLimit();
    
    return this.circuitBreaker.execute(async () => {
      const response = await this.makeAuthenticatedRequest<GateAccountBalance[]>(
        'GET',
        '/api/v4/spot/accounts'
      );
      
      // Convert to a more usable format
      const balances: { [currency: string]: { available: number; locked: number } } = {};
      
      if (response.data) {
        for (const balance of response.data) {
          balances[balance.currency] = {
            available: parseFloat(balance.available),
            locked: parseFloat(balance.locked)
          };
        }
      }
      
      return balances;
    });
  }

  async placeBuyOrder(symbol: string, amount: number, price: number): Promise<TradeExecution> {
    await this.ensureAuthenticated();
    await this.rateLimiter.checkLimit();
    
    const currencyPair = this.formatSymbol(symbol);
    
    return this.circuitBreaker.execute(async () => {
      const orderData = {
        currency_pair: currencyPair,
        type: 'limit',
        account: 'spot',
        side: 'buy' as const,
        amount: amount.toString(),
        price: price.toString(),
        time_in_force: 'gtc'
      };

      const response = await this.makeAuthenticatedRequest<GateOrderResponse>(
        'POST',
        '/api/v4/spot/orders',
        orderData
      );

      if (!response.data) {
        throw new Error('No order data returned from Gate.io');
      }

      return this.convertToTradeExecution(response.data, symbol);
    });
  }

  async placeSellOrder(symbol: string, amount: number, price: number): Promise<TradeExecution> {
    await this.ensureAuthenticated();
    await this.rateLimiter.checkLimit();
    
    const currencyPair = this.formatSymbol(symbol);
    
    return this.circuitBreaker.execute(async () => {
      const orderData = {
        currency_pair: currencyPair,
        type: 'limit',
        account: 'spot',
        side: 'sell' as const,
        amount: amount.toString(),
        price: price.toString(),
        time_in_force: 'gtc'
      };

      const response = await this.makeAuthenticatedRequest<GateOrderResponse>(
        'POST',
        '/api/v4/spot/orders',
        orderData
      );

      if (!response.data) {
        throw new Error('No order data returned from Gate.io');
      }

      return this.convertToTradeExecution(response.data, symbol);
    });
  }

  async getOpenPositions(): Promise<TradingPosition[]> {
    await this.ensureAuthenticated();
    await this.rateLimiter.checkLimit();
    
    return this.circuitBreaker.execute(async () => {
      const response = await this.makeAuthenticatedRequest<GateOrderResponse[]>(
        'GET',
        '/api/v4/spot/orders',
        { status: 'open' }
      );

      if (!response.data) {
        return [];
      }

      return response.data.map(order => this.convertToTradingPosition(order));
    });
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    await this.ensureAuthenticated();
    await this.rateLimiter.checkLimit();
    
    return this.circuitBreaker.execute(async () => {
      try {
        await this.makeAuthenticatedRequest(
          'DELETE',
          `/api/v4/spot/orders/${orderId}`
        );
        return true;
      } catch (error) {
        this.errorHandler.logError(error as Error, `Cancel order ${orderId}`);
        return false;
      }
    });
  }

  /**
   * Get order status and details by order ID
   */
  async getOrderStatus(orderId: string, currencyPair?: string): Promise<TradeExecution | null> {
    await this.ensureAuthenticated();
    await this.rateLimiter.checkLimit();
    
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.makeAuthenticatedRequest<GateOrderResponse>(
          'GET',
          `/api/v4/spot/orders/${orderId}`,
          currencyPair ? { currency_pair: currencyPair } : undefined
        );

        if (!response.data) {
          return null;
        }

        const symbol = response.data.currency_pair.replace('_', '/');
        return this.convertToTradeExecution(response.data, symbol);
      } catch (error) {
        this.errorHandler.logError(error as Error, `Get order status ${orderId}`);
        return null;
      }
    });
  }

  /**
   * Get all orders for a specific currency pair with optional status filter
   */
  async getOrders(symbol: string, status?: 'open' | 'finished', limit: number = 100): Promise<TradeExecution[]> {
    await this.ensureAuthenticated();
    await this.rateLimiter.checkLimit();
    
    const currencyPair = this.formatSymbol(symbol);
    
    return this.circuitBreaker.execute(async () => {
      const params: any = {
        currency_pair: currencyPair,
        limit: limit.toString()
      };

      if (status) {
        params.status = status;
      }

      const response = await this.makeAuthenticatedRequest<GateOrderResponse[]>(
        'GET',
        '/api/v4/spot/orders',
        params
      );

      if (!response.data) {
        return [];
      }

      return response.data.map(order => this.convertToTradeExecution(order, symbol));
    });
  }

  /**
   * Get trading history for a specific symbol
   */
  async getTradingHistory(symbol: string, limit: number = 100): Promise<TradeExecution[]> {
    await this.ensureAuthenticated();
    await this.rateLimiter.checkLimit();
    
    const currencyPair = this.formatSymbol(symbol);
    
    return this.circuitBreaker.execute(async () => {
      const response = await this.makeAuthenticatedRequest<any[]>(
        'GET',
        '/api/v4/spot/my_trades',
        {
          currency_pair: currencyPair,
          limit: limit.toString()
        }
      );

      if (!response.data) {
        return [];
      }

      return response.data.map(trade => ({
        id: crypto.randomUUID(),
        orderId: trade.order_id,
        symbol,
        side: trade.side,
        amount: parseFloat(trade.amount),
        price: parseFloat(trade.price),
        fee: parseFloat(trade.fee || '0'),
        status: 'filled' as const,
        timestamp: new Date(parseInt(trade.create_time) * 1000)
      }));
    });
  }

  /**
   * Place a market buy order (buy at current market price)
   */
  async placeMarketBuyOrder(symbol: string, amount: number): Promise<TradeExecution> {
    await this.ensureAuthenticated();
    await this.rateLimiter.checkLimit();
    
    const currencyPair = this.formatSymbol(symbol);
    
    return this.circuitBreaker.execute(async () => {
      const orderData = {
        currency_pair: currencyPair,
        type: 'market',
        account: 'spot',
        side: 'buy' as const,
        amount: amount.toString(),
        time_in_force: 'ioc' // Immediate or Cancel for market orders
      };

      const response = await this.makeAuthenticatedRequest<GateOrderResponse>(
        'POST',
        '/api/v4/spot/orders',
        orderData
      );

      if (!response.data) {
        throw new Error('No order data returned from Gate.io');
      }

      return this.convertToTradeExecution(response.data, symbol);
    });
  }

  /**
   * Place a market sell order (sell at current market price)
   */
  async placeMarketSellOrder(symbol: string, amount: number): Promise<TradeExecution> {
    await this.ensureAuthenticated();
    await this.rateLimiter.checkLimit();
    
    const currencyPair = this.formatSymbol(symbol);
    
    return this.circuitBreaker.execute(async () => {
      const orderData = {
        currency_pair: currencyPair,
        type: 'market',
        account: 'spot',
        side: 'sell' as const,
        amount: amount.toString(),
        time_in_force: 'ioc' // Immediate or Cancel for market orders
      };

      const response = await this.makeAuthenticatedRequest<GateOrderResponse>(
        'POST',
        '/api/v4/spot/orders',
        orderData
      );

      if (!response.data) {
        throw new Error('No order data returned from Gate.io');
      }

      return this.convertToTradeExecution(response.data, symbol);
    });
  }

  /**
   * Get current positions with real-time P&L calculation
   */
  async getCurrentPositions(): Promise<TradingPosition[]> {
    const openOrders = await this.getOpenPositions();
    const positions: TradingPosition[] = [];

    // Get current market prices for all symbols
    const symbols = [...new Set(openOrders.map(order => order.symbol))];
    const currentPrices = await this.getRealTimePrices(symbols);

    for (const order of openOrders) {
      const currentPrice = currentPrices[order.symbol] || order.entryPrice;
      const unrealizedPnL = this.calculateUnrealizedPnL(order, currentPrice);

      positions.push({
        ...order,
        currentPrice,
        unrealizedPnL
      });
    }

    return positions;
  }

  /**
   * Cancel all open orders for a specific symbol
   */
  async cancelAllOrders(symbol?: string): Promise<{ cancelled: number; failed: number }> {
    await this.ensureAuthenticated();
    
    let openOrders: TradeExecution[];
    
    if (symbol) {
      openOrders = await this.getOrders(symbol, 'open');
    } else {
      // Get all open orders across all pairs
      const response = await this.makeAuthenticatedRequest<GateOrderResponse[]>(
        'GET',
        '/api/v4/spot/orders',
        { status: 'open' }
      );
      
      openOrders = response.data ? response.data.map(order => 
        this.convertToTradeExecution(order, order.currency_pair.replace('_', '/'))
      ) : [];
    }

    let cancelled = 0;
    let failed = 0;

    // Cancel orders in parallel but with rate limiting
    for (const order of openOrders) {
      try {
        const success = await this.cancelOrder(order.orderId);
        if (success) {
          cancelled++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        this.errorHandler.logError(error as Error, `Cancel order ${order.orderId}`);
      }
    }

    return { cancelled, failed };
  }

  private async getTicker(currencyPair: string): Promise<GateTickerResponse> {
    await this.rateLimiter.checkLimit();
    
    const response = await this.makeRequest<GateTickerResponse>(
      'GET',
      `/api/v4/spot/tickers?currency_pair=${currencyPair}`
    );

    if (!response.data) {
      throw new Error(`No ticker data for ${currencyPair}`);
    }

    return Array.isArray(response.data) ? response.data[0] : response.data;
  }

  private async getOrderBook(currencyPair: string, limit: number = 20): Promise<GateOrderBookResponse> {
    await this.rateLimiter.checkLimit();
    
    const response = await this.makeRequest<GateOrderBookResponse>(
      'GET',
      `/api/v4/spot/order_book?currency_pair=${currencyPair}&limit=${limit}`
    );

    if (!response.data) {
      throw new Error(`No order book data for ${currencyPair}`);
    }

    return response.data;
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<GateApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    return this.retryWithBackoff(async () => {
      const dispatcher = getProxyDispatcher();
      const response = await fetch(url, { ...options, dispatcher });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    }, this.maxRetries, this.baseDelay);
  }

  private async makeAuthenticatedRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<GateApiResponse<T>> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = data && method !== 'GET' ? JSON.stringify(data) : '';
    const queryString = method === 'GET' && data ? this.buildQueryString(data) : '';
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    // Create signature according to Gate.io API documentation
    const message = `${method}\n${fullEndpoint}\n${queryString}\n${crypto.createHash('sha512').update(body).digest('hex')}\n${timestamp}`;
    const signature = crypto.createHmac('sha512', this.config.apiSecret).update(message).digest('hex');

    const url = `${this.config.baseUrl}${fullEndpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'KEY': this.config.apiKey,
        'Timestamp': timestamp,
        'SIGN': signature
      }
    };

    if (body && method !== 'GET') {
      options.body = body;
    }

    return this.retryWithBackoff(async () => {
      const dispatcher = getProxyDispatcher();
      const response = await fetch(url, { ...options, dispatcher });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    }, this.maxRetries, this.baseDelay);
  }

  private buildQueryString(params: Record<string, any>): string {
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  private formatSymbol(symbol: string): string {
    // Convert from "BTC/USDT" format to "BTC_USDT" format used by Gate.io
    return symbol.replace('/', '_');
  }

  private convertToTradeExecution(order: GateOrderResponse, symbol: string): TradeExecution {
    return {
      id: crypto.randomUUID(),
      orderId: order.id,
      symbol,
      side: order.side,
      amount: parseFloat(order.amount),
      price: parseFloat(order.price),
      fee: parseFloat(order.fee || '0'),
      status: this.mapOrderStatus(order.status),
      timestamp: new Date(parseInt(order.create_time) * 1000)
    };
  }

  private convertToTradingPosition(order: GateOrderResponse): TradingPosition {
    const symbol = order.currency_pair.replace('_', '/');
    const amount = parseFloat(order.amount);
    const entryPrice = parseFloat(order.price);
    
    return {
      id: order.id,
      symbol,
      side: order.side,
      amount,
      entryPrice,
      currentPrice: entryPrice, // Would need current market price for accurate value
      unrealizedPnL: 0, // Would need current market price to calculate
      timestamp: new Date(parseInt(order.create_time) * 1000),
      status: order.status === 'open' ? 'open' : 'closed'
    };
  }

  private mapOrderStatus(gateStatus: string): 'pending' | 'filled' | 'cancelled' {
    switch (gateStatus) {
      case 'open':
        return 'pending';
      case 'closed':
        return 'filled';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.authenticated) {
      const success = await this.authenticate();
      if (!success) {
        throw new Error('Gate.io authentication required');
      }
    }
  }

  /**
   * Calculate simplified RSI using current price relative to 24h high/low
   * This is a simplified version - real RSI requires 14 periods of price data
   */
  private calculateRSIFromPrice(currentPrice: number, high24h: number, low24h: number): number {
    if (high24h === low24h) return 50; // Neutral RSI if no price movement
    
    // Calculate where current price sits in the 24h range (0-100)
    const pricePosition = ((currentPrice - low24h) / (high24h - low24h)) * 100;
    
    // Convert to RSI-like scale (typically 30-70 range for most conditions)
    return Math.max(20, Math.min(80, pricePosition));
  }

  /**
   * Calculate unrealized P&L for a position
   */
  private calculateUnrealizedPnL(position: TradingPosition, currentPrice: number): number {
    const priceDiff = currentPrice - position.entryPrice;
    
    if (position.side === 'buy') {
      // Long position: profit when price goes up
      return priceDiff * position.amount;
    } else {
      // Short position: profit when price goes down
      return -priceDiff * position.amount;
    }
  }
}
