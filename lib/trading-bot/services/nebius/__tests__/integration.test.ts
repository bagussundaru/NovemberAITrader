import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NebiusService } from '../nebius-service';
import { configManager } from '../../../config';

// Mock the config manager
vi.mock('../../../config', () => ({
  configManager: {
    getNebiusConfig: vi.fn(() => ({
      apiUrl: 'https://api.nebius.ai',
      jwtToken: 'test-jwt-token',
      model: 'test-model',
      maxRetries: 2,
      timeout: 5000
    }))
  }
}));

describe('NebiusService Integration Tests', () => {
  let nebiusService: NebiusService;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    
    const config = configManager.getNebiusConfig();
    nebiusService = new NebiusService(config);
  });

  it('should complete full authentication and analysis workflow', async () => {
    // Mock authentication response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'authenticated-token',
        expires_in: 3600,
        token_type: 'Bearer'
      })
    });

    // Mock market analysis response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        recommendation: {
          action: 'buy',
          confidence: 0.75,
          target_price: 51500,
          stop_loss: 48500
        },
        reasoning: 'Technical indicators show strong bullish momentum',
        analysis: {
          trend: 'bullish',
          support_level: 49000,
          resistance_level: 52000,
          volume_analysis: 'above_average'
        }
      })
    });

    // Test authentication
    const authResult = await nebiusService.authenticate();
    expect(authResult).toBe(true);
    expect(nebiusService.isServiceAuthenticated()).toBe(true);

    // Test market analysis
    const marketData = {
      symbol: 'BTC/USDT',
      timestamp: Date.now(),
      price: 50000,
      volume: 1500,
      orderBook: {
        bids: [{ price: 49950, amount: 2.1 }],
        asks: [{ price: 50050, amount: 1.9 }]
      },
      indicators: {
        rsi: 65,
        macd: 0.8,
        movingAverage: 49800
      }
    };

    const analysisResult = await nebiusService.analyzeMarket(marketData);

    // Verify the complete trading signal
    expect(analysisResult).toEqual({
      symbol: 'BTC/USDT',
      action: 'buy',
      confidence: 0.75,
      targetPrice: 51500,
      stopLoss: 48500,
      reasoning: 'Technical indicators show strong bullish momentum',
      timestamp: expect.any(Date)
    });

    // Verify API calls were made correctly
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle complete failure scenario gracefully', async () => {
    // Mock authentication failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    // Authentication should fail
    await expect(nebiusService.authenticate()).rejects.toThrow('Authentication failed');
    expect(nebiusService.isServiceAuthenticated()).toBe(false);
  });

  it('should handle service state correctly', async () => {
    // Initially not authenticated
    expect(nebiusService.isServiceAuthenticated()).toBe(false);
    
    // Mock successful authentication
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'valid-token'
      })
    });

    const authResult = await nebiusService.authenticate();
    expect(authResult).toBe(true);
    expect(nebiusService.isServiceAuthenticated()).toBe(true);
    
    // Reset should work
    nebiusService.resetAuthentication();
    expect(nebiusService.isServiceAuthenticated()).toBe(false);
  });
});