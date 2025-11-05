// Test setup file for Nebius service tests
import { vi } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock setTimeout and clearTimeout for testing retry logic
vi.mock('timers', () => ({
  setTimeout: vi.fn((fn, delay) => {
    // For testing, we can make timeouts resolve immediately or with minimal delay
    return global.setTimeout(fn, Math.min(delay, 10));
  }),
  clearTimeout: vi.fn(global.clearTimeout),
}));

// Setup fetch mock
Object.defineProperty(global, 'fetch', {
  writable: true,
  value: vi.fn(),
});

// Mock AbortController for timeout handling
global.AbortController = class AbortController {
  signal = {
    aborted: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  
  abort = vi.fn(() => {
    this.signal.aborted = true;
  });
};