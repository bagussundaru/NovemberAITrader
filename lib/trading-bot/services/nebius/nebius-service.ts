import { NebiusAIService, NebiusConfig, NebiusError, MarketData, TradingSignal } from '../../types';
import { getProxyDispatcher } from '../../../utils/proxy-dispatcher'

export class NebiusService implements NebiusAIService {
  private config: NebiusConfig;
  private isAuthenticated: boolean = false;
  private authToken: string | null = null;
  private retryCount: number = 0;
  private lastAuthAttempt: number = 0;
  private readonly AUTH_RETRY_DELAY = 30000; // 30 seconds

  constructor(config: NebiusConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Nebius AI platform using JWT token
   * Implements retry logic with exponential backoff
   */
  async authenticate(): Promise<boolean> {
    const now = Date.now();
    
    // Prevent too frequent authentication attempts
    if (now - this.lastAuthAttempt < this.AUTH_RETRY_DELAY && this.retryCount > 0) {
      const waitMs = this.AUTH_RETRY_DELAY - (now - this.lastAuthAttempt);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    this.lastAuthAttempt = now;

    try {
      const response = await this.makeAuthRequest();
      
      if (response.ok) {
        const authData = await response.json();
        this.authToken = authData.access_token || this.config.jwtToken;
        this.isAuthenticated = true;
        this.retryCount = 0;
        
        console.log('Successfully authenticated with Nebius AI platform');
        return true;
      } else {
        throw new NebiusError(
          `Authentication failed: ${response.status} ${response.statusText}`,
          'AUTH_FAILED',
          response.status
        );
      }
    } catch (error) {
      this.isAuthenticated = false;
      this.retryCount++;
      
      if (error instanceof NebiusError) {
        console.error(`Nebius authentication error: ${error.message}`);
        throw error;
      }
      
      const nebiusError = new NebiusError(
        `Network error during authentication: ${error.message}`,
        'NETWORK_ERROR'
      );
      console.error(`Nebius authentication network error: ${nebiusError.message}`);
      throw nebiusError;
    }
  }

  /**
   * Make HTTP request for authentication
   */
  private async makeAuthRequest(): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const dispatcher = getProxyDispatcher();
      const targetUrl = `${this.config.apiUrl}/models`;
      const outbound = process.env.OUTBOUND_PROXY_ENDPOINT;
      let response: Response;

      if (outbound) {
        const proxyRes = await fetch(outbound, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: targetUrl,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${this.config.jwtToken}` }
          }),
          signal: controller.signal,
          dispatcher
        });
        const payload = await proxyRes.json();
        if (!payload.success) {
          throw new Error(payload.error || 'Proxy request failed');
        }
        response = new Response(
          typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data),
          { status: payload.status || 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.jwtToken}`
          },
          signal: controller.signal,
          dispatcher
        });
      }

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Send market data to Nebius AI platform for analysis
   */
  async analyzeMarket(marketData: MarketData): Promise<TradingSignal> {
    // Validate input market data
    this.validateMarketData(marketData);
    
    await this.ensureAuthenticated();

    let attempt = 0;
    const maxRetries = this.config.maxRetries;

    while (attempt <= maxRetries) {
      try {
        const response = await this.makeAnalysisRequest(marketData);
        
        if (response.ok) {
          const analysisResult = await response.json();
          return this.parseAnalysisResponse(analysisResult, marketData.symbol);
        } else {
          await this.handleApiError(response, attempt, maxRetries);
        }
      } catch (error) {
        if (error instanceof NebiusError) {
          // If it's a rate limit or auth error, don't retry immediately
          if (error.code === 'RATE_LIMIT' || error.code === 'AUTH_FAILED') {
            throw error;
          }
        }
        
        // Handle network errors with retry logic
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          console.warn(`Network error on attempt ${attempt + 1}, retrying in ${delay}ms: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }
        
        throw new NebiusErrorImpl(
          `Network error during market analysis after ${maxRetries} retries: ${error.message}`,
          'NETWORK_ERROR'
        );
      }
      
      attempt++;
    }

    throw new NebiusErrorImpl(
      `Market analysis failed after ${maxRetries} attempts`,
      'MAX_RETRIES_EXCEEDED'
    );
  }

  /**
   * Validate market data before sending to API
   */
  private validateMarketData(marketData: MarketData): void {
    if (!marketData) {
      throw new NebiusError('Market data is required', 'INVALID_INPUT');
    }

    if (!marketData.symbol || typeof marketData.symbol !== 'string') {
      throw new NebiusError('Valid symbol is required', 'INVALID_INPUT');
    }

    if (typeof marketData.price !== 'number' || marketData.price <= 0) {
      throw new NebiusError('Valid price is required', 'INVALID_INPUT');
    }

    if (typeof marketData.timestamp !== 'number' || marketData.timestamp <= 0) {
      throw new NebiusError('Valid timestamp is required', 'INVALID_INPUT');
    }
  }

  /**
   * Handle API errors with appropriate retry logic
   */
  private async handleApiError(response: Response, attempt: number, maxRetries: number): Promise<void> {
    const status = response.status;
    const statusText = response.statusText;

    switch (status) {
      case 429: // Rate limit
        await this.handleRateLimit();
        throw new NebiusError('Rate limit exceeded', 'RATE_LIMIT', 429);
        
      case 401: // Unauthorized
        this.resetAuthentication();
        if (attempt < maxRetries) {
          console.warn('Authentication expired, attempting to re-authenticate');
          await this.authenticate();
          return; // Continue with retry
        }
        throw new NebiusError('Authentication failed', 'AUTH_FAILED', 401);
        
      case 400: // Bad request
        throw new NebiusError(`Bad request: ${statusText}`, 'BAD_REQUEST', 400);
        
      case 403: // Forbidden
        throw new NebiusError(`Access forbidden: ${statusText}`, 'FORBIDDEN', 403);
        
      case 500: // Server error
      case 502: // Bad gateway
      case 503: // Service unavailable
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          console.warn(`Server error ${status}, retrying in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return; // Continue with retry
        }
        throw new NebiusError(`Server error: ${status} ${statusText}`, 'SERVER_ERROR', status);
        
      default:
        throw new NebiusError(
          `API request failed: ${status} ${statusText}`,
          'API_ERROR',
          status
        );
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = baseDelay * Math.pow(2, attempt);
    return Math.min(delay, maxDelay);
  }

  /**
   * Make HTTP request for market analysis
   */
  private async makeAnalysisRequest(marketData: MarketData): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const dispatcher = getProxyDispatcher();
      const targetUrl = `${this.config.apiUrl}/chat/completions`;
      const outbound = process.env.OUTBOUND_PROXY_ENDPOINT;
      let response: Response;

      const requestBody = {
        model: this.config.model || 'deepseek-ai/DeepSeek-V3-0324',
        messages: [
          { role: 'system', content: 'You are a professional crypto trading analyst. Respond with JSON only.' },
          { role: 'user', content: `Analyze ${marketData.symbol} with price ${marketData.price}, volume ${marketData.volume}. Return JSON: {"action":"BUY|SELL|HOLD","confidence":0.xx,"target_price":number,"stop_loss":number,"reasoning":"..."}` }
        ],
        temperature: 0.2
      };

      if (outbound) {
        const proxyRes = await fetch(outbound, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: targetUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.authToken || this.config.jwtToken}`
            },
            data: requestBody
          }),
          signal: controller.signal,
          dispatcher
        });
        const payload = await proxyRes.json();
        if (!payload.success) {
          throw new Error(payload.error || 'Proxy request failed');
        }
        response = new Response(
          typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data),
          { status: payload.status || 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken || this.config.jwtToken}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
          dispatcher
        });
      }

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse AI analysis response into trading signal
   */
  private parseAnalysisResponse(response: any, symbol: string): TradingSignal {
    // Validate response structure
    if (!response || typeof response !== 'object') {
      throw new NebiusError('Invalid response format from Nebius AI', 'INVALID_RESPONSE');
    }

    // Extract recommendation data with validation
    const recommendation = response.recommendation || {};
    const action = this.validateAction(recommendation.action);
    const confidence = this.validateConfidence(recommendation.confidence);
    const targetPrice = this.validatePrice(recommendation.target_price, 'target_price');
    const stopLoss = this.validatePrice(recommendation.stop_loss, 'stop_loss');

    return {
      symbol,
      action,
      confidence,
      targetPrice,
      stopLoss,
      reasoning: response.reasoning || response.analysis || 'No reasoning provided',
      timestamp: new Date()
    };
  }

  /**
   * Validate trading action from AI response
   */
  private validateAction(action: any): 'buy' | 'sell' | 'hold' {
    const validActions = ['buy', 'sell', 'hold'];
    
    if (typeof action === 'string' && validActions.includes(action.toLowerCase())) {
      return action.toLowerCase() as 'buy' | 'sell' | 'hold';
    }
    
    console.warn(`Invalid action received: ${action}, defaulting to 'hold'`);
    return 'hold';
  }

  /**
   * Validate confidence score from AI response
   */
  private validateConfidence(confidence: any): number {
    const numConfidence = parseFloat(confidence);
    
    if (isNaN(numConfidence)) {
      console.warn(`Invalid confidence received: ${confidence}, defaulting to 0`);
      return 0;
    }
    
    // Clamp confidence between 0 and 1
    return Math.max(0, Math.min(1, numConfidence));
  }

  /**
   * Validate price values from AI response
   */
  private validatePrice(price: any, fieldName: string): number {
    const numPrice = parseFloat(price);
    
    if (isNaN(numPrice) || numPrice < 0) {
      console.warn(`Invalid ${fieldName} received: ${price}, defaulting to 0`);
      return 0;
    }
    
    return numPrice;
  }

  /**
   * Get trade recommendation (alias for analyzeMarket for interface compatibility)
   */
  async getTradeRecommendation(analysis: any): Promise<TradingSignal> {
    // If analysis is already a MarketData object, use it directly
    if (analysis && typeof analysis === 'object' && analysis.symbol) {
      return this.analyzeMarket(analysis as MarketData);
    }
    
    throw new NebiusError('Invalid analysis data provided', 'INVALID_INPUT');
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  async handleRateLimit(): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000); // Max 30 seconds
    console.warn(`Rate limit hit, waiting ${delay}ms before retry`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    this.retryCount++;
  }

  /**
   * Ensure authentication is valid before making API calls
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated || !this.authToken) {
      await this.authenticate();
    }
  }

  /**
   * Check if service is currently authenticated
   */
  public isServiceAuthenticated(): boolean {
    return this.isAuthenticated && !!this.authToken;
  }

  /**
   * Reset authentication state (useful for testing or forced re-auth)
   */
  public resetAuthentication(): void {
    this.isAuthenticated = false;
    this.authToken = null;
    this.retryCount = 0;
    this.lastAuthAttempt = 0;
  }

  /**
   * Get current retry count (useful for monitoring)
   */
  public getRetryCount(): number {
    return this.retryCount;
  }
}

/**
 * Custom error class for Nebius-specific errors
 */
class NebiusErrorImpl extends Error {
  public code: string;
  public statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'NebiusError';
    this.code = code;
    this.statusCode = statusCode;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NebiusError);
    }
  }
}

export { NebiusError };
