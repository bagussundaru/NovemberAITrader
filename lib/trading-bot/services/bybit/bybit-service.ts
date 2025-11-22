// Bybit Exchange Service Implementation (Spot)
// Implements API key/secret authentication and basic market/order endpoints

import crypto from 'crypto'
import { BaseService, RateLimiter, CircuitBreaker } from '../base'
import { getProxyDispatcher } from '../../../utils/proxy-dispatcher'
import {
  GateExchangeService,
  MarketData,
  TradeExecution,
  TradingPosition,
  OrderBook,
  OrderBookLevel,
  TechnicalIndicators,
  ErrorHandler
} from '../../types'

type HttpMethod = 'GET' | 'POST'

interface BybitConfig {
  baseUrl: string
  apiKey: string
  apiSecret: string
  testnet: boolean
}

interface BybitResponse<T = any> {
  retCode: number
  retMsg: string
  result?: T
}

export class BybitService extends BaseService implements GateExchangeService {
  private rateLimiter: RateLimiter
  private circuitBreaker: CircuitBreaker
  private authenticated: boolean = false
  private maxRetries: number
  private baseDelay: number

  constructor(config: BybitConfig, errorHandler: ErrorHandler, options?: { maxRetries?: number; baseDelay?: number }) {
    super(config, errorHandler)
    this.rateLimiter = new RateLimiter(900, 60000)
    this.circuitBreaker = new CircuitBreaker(5, 60000)
    this.maxRetries = options?.maxRetries ?? 3
    this.baseDelay = options?.baseDelay ?? 1000
    this.validateConfig()
  }

  private validateConfig(): void {
    this.validateRequired((this.config as BybitConfig).apiKey, 'Bybit API Key')
    this.validateRequired((this.config as BybitConfig).apiSecret, 'Bybit API Secret')
    this.validateRequired((this.config as BybitConfig).baseUrl, 'Bybit Base URL')
  }

  async authenticate(): Promise<boolean> {
    try {
      await this.getAccountBalance()
      this.authenticated = true
      return true
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Bybit authenticate')
      this.authenticated = false
      return false
    }
  }

  private buildQuery(params: Record<string, any>): string {
    return Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
  }

  private sign(method: HttpMethod, params: Record<string, any>, body?: string): { headers: Record<string, string>; timestamp: string; recvWindow: string } {
    const timestamp = Date.now().toString()
    const recvWindow = '5000'
    const payload = method === 'GET' ? this.buildQuery(params || {}) : (body || '')
    const preSignature = timestamp + (this.config as BybitConfig).apiKey + recvWindow + payload
    const signature = crypto.createHmac('sha256', (this.config as BybitConfig).apiSecret).update(preSignature).digest('hex')
    return {
      headers: {
        'X-BAPI-API-KEY': (this.config as BybitConfig).apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'Content-Type': 'application/json'
      },
      timestamp,
      recvWindow
    }
  }

  private async request<T>(method: HttpMethod, endpoint: string, params?: Record<string, any>, signed: boolean = false): Promise<T> {
    const url = new URL(`${(this.config as BybitConfig).baseUrl}${endpoint}`)
    let body: string | undefined
    let headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (method === 'GET') {
      if (params) url.search = this.buildQuery(params)
    } else {
      body = JSON.stringify(params || {})
    }

    if (signed) {
      const signData = this.sign(method, params || {}, body)
      headers = { ...headers, ...signData.headers }
    }

    return this.retryWithBackoff(async () => {
      const dispatcher = getProxyDispatcher()
      const outboundProxy = process.env.OUTBOUND_PROXY_ENDPOINT
      if (outboundProxy) {
        const proxiedRes = await fetch(outboundProxy, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.toString(), method, headers, data: body ? JSON.parse(body) : undefined })
        })
        if (!proxiedRes.ok) {
          const text = await proxiedRes.text()
          throw new Error(`Proxy HTTP ${proxiedRes.status}: ${text}`)
        }
        const proxyJson = await proxiedRes.json()
        if (!proxyJson.success) {
          throw new Error(`Proxy error: ${proxyJson.error || 'unknown'}`)
        }
        const json = proxyJson.data as BybitResponse<T>
        if (!json || typeof json !== 'object') {
          return proxyJson.data as T
        }
        if ((json as any).retCode !== 0) {
          throw new Error(`Bybit API Error ${(json as any).retCode}: ${(json as any).retMsg}`)
        }
        return ((json as any).result as T) ?? ({} as T)
      }
      const res = await fetch(url.toString(), { method, headers, body, dispatcher })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
      }
      const json = (await res.json()) as BybitResponse<T>
      if (json.retCode !== 0) {
        throw new Error(`Bybit API Error ${json.retCode}: ${json.retMsg}`)
      }
      return (json.result as T) ?? ({} as T)
    }, this.maxRetries, this.baseDelay)
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    await this.rateLimiter.checkLimit()
    const norm = symbol.replace('/', '')
    const ticker = await this.request<any>('GET', '/v5/market/tickers', { category: 'spot', symbol: norm })
    const ob = await this.request<any>('GET', '/v5/market/orderbook', { category: 'spot', symbol: norm, limit: 50 })
    const last = ticker.list?.[0]
    const price = parseFloat(last?.lastPrice || '0')
    const volume = parseFloat(last?.volume24h || '0')

    const orderBook: OrderBook = {
      bids: (ob.b ?? []).slice(0, 20).map((l: [string, string]): OrderBookLevel => ({ price: parseFloat(l[0]), amount: parseFloat(l[1]) })),
      asks: (ob.a ?? []).slice(0, 20).map((l: [string, string]): OrderBookLevel => ({ price: parseFloat(l[0]), amount: parseFloat(l[1]) }))
    }

    const indicators: TechnicalIndicators = {
      rsi: 50,
      macd: 0,
      movingAverage: price
    }

    return {
      symbol,
      timestamp: Date.now(),
      price,
      volume,
      orderBook,
      indicators
    }
  }

  async getAccountBalance(): Promise<any> {
    await this.rateLimiter.checkLimit()
    return this.circuitBreaker.execute(async () => {
      const result = await this.request<any>('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' }, true)
      const balances: { [currency: string]: { available: number; locked: number } } = {}
      const list = result.list?.[0]?.coin || []
      for (const c of list) {
        balances[c.coin] = { available: parseFloat(c.availableToWithdraw || '0'), locked: parseFloat(c.equity || '0') - parseFloat(c.availableToWithdraw || '0') }
      }
      return balances
    })
  }

  async placeBuyOrder(symbol: string, amount: number, price: number): Promise<TradeExecution> {
    await this.ensureAuthenticated()
    await this.rateLimiter.checkLimit()
    const norm = symbol.replace('/', '')
    const params = { category: 'spot', symbol: norm, side: 'Buy', orderType: 'Limit', qty: amount.toString(), price: price.toString(), timeInForce: 'GTC' }
    const result = await this.request<any>('POST', '/v5/order/create', params, true)
    const order = result.orderId || result.order?.orderId || `${Date.now()}`
    return { id: crypto.randomUUID(), orderId: order, symbol, side: 'buy', amount, price, fee: 0, status: 'pending', timestamp: new Date() }
  }

  async placeSellOrder(symbol: string, amount: number, price: number): Promise<TradeExecution> {
    await this.ensureAuthenticated()
    await this.rateLimiter.checkLimit()
    const norm = symbol.replace('/', '')
    const params = { category: 'spot', symbol: norm, side: 'Sell', orderType: 'Limit', qty: amount.toString(), price: price.toString(), timeInForce: 'GTC' }
    const result = await this.request<any>('POST', '/v5/order/create', params, true)
    const order = result.orderId || result.order?.orderId || `${Date.now()}`
    return { id: crypto.randomUUID(), orderId: order, symbol, side: 'sell', amount, price, fee: 0, status: 'pending', timestamp: new Date() }
  }

  async getOpenPositions(): Promise<TradingPosition[]> {
    await this.ensureAuthenticated()
    await this.rateLimiter.checkLimit()
    // Use open orders as positions proxy for spot
    const result = await this.request<any>('GET', '/v5/order/realtime', { category: 'spot' }, true)
    const list = result.list || []
    const positions: TradingPosition[] = list.map((o: any) => ({
      id: o.orderId,
      symbol: (o.symbol || '').replace(/(USDT|USD)$/,'') + '/USDT',
      side: (o.side || 'Buy').toLowerCase(),
      amount: parseFloat(o.qty || '0'),
      entryPrice: parseFloat(o.price || '0'),
      currentPrice: parseFloat(o.price || '0'),
      unrealizedPnL: 0,
      timestamp: new Date(parseInt(o.createdTime || Date.now())),
      status: o.orderStatus === 'Filled' ? 'closed' : 'open'
    }))
    return positions
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    await this.ensureAuthenticated()
    await this.rateLimiter.checkLimit()
    await this.request<any>('POST', '/v5/order/cancel', { category: 'spot', orderId }, true)
    return true
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.authenticated) {
      const ok = await this.authenticate()
      if (!ok) throw new Error('Bybit authentication required')
    }
  }
}
