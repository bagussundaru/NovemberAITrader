import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NebiusService } from '../nebius-service';

describe('NebiusService Integration Tests', () => {
  let service: NebiusService;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    
    const config = {
      apiUrl: 'https://api.nebius.ai',
      jwtToken: 'test-jwt-token',
      model: 'test-model',
      maxRetries: 2,
      timeout: 5000
    };
    
    service = new NebiusService(config);
  });

  it('should complete authentication workflow', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'authenticated-token',
        expires_in: 3600
      })
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

    await expect(service.authenticate()).rejects.toThrow('Authentication failed');
    expect(service.isServiceAuthenticated()).toBe(false);
  });

  it('should manage service state correctly', async () => {
    expect(service.isServiceAuthenticated()).toBe(false);
    
    service.resetAuthentication();
    expect(service.isServiceAuthenticated()).toBe(false);
    expect(service.getRetryCount()).toBe(0);
  });
});