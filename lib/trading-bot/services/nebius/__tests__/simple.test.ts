import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NebiusService, NebiusError } from '../nebius-service';
import { NebiusConfig, MarketData } from '../../../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('NebiusService Simple Tests', () => {
  let service: NebiusService;
  let config: NebiusConfig;
  let marketData: MarketData;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      apiUrl: 'https://api.nebius.ai',
      jwtToken: 'test-jwt-token',
      model: 'test-model',
      maxRetries: 2,
      timeout: 5000
    };

    marketData = {
      symbol: 'BTC/USDT',
      timestamp: Date.now(),
      price: 50000,
      volume: 1000,
      orderBook: {
        bids: [{ price: 49999, amount: 1 }],
        asks: [{ price: 50001, amount: 1 }]
      },
      indicators: {
        rsi: 65,
        macd: 0.5,
        movingAverage: 49500
      }
    };

    service = new NebiusService(config);
  });

  it('should create service instance', () => {
    expect(service).toBeDefined();
    expect(service.isServiceAuthenticated()).toBe(false);
  });

  it('should authenticate successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'test-token' })
    });

    const result = await service.authenticate();
    expect(result).toBe(true);
    expect(service.isServiceAuthenticated()).toBe(true);
  });

  it('should handle authentication failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    await expect(service.authenticate()).rejects.toThrow(NebiusError);
    expect(service.isServiceAuthenticated()).toBe(false);
  });

  it('should validate market data input', async () => {
    const invalidData = { ...marketData, symbol: '' };
    
    await expect(service.analyzeMarket(invalidData)).rejects.toThrow('Valid symbol is required');
  });

  it('should reset authentication state', () => {
    service.resetAuthentication();
    expect(service.isServiceAuthenticated()).toBe(false);
    expect(service.getRetryCount()).toBe(0);
  });

  it('should create NebiusError correctly', () => {
    const error = new NebiusError('Test message', 'TEST_CODE', 400);
    
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('NebiusError');
  });
});