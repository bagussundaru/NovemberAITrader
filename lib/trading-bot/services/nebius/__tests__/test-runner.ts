/**
 * Simple test runner for Nebius service tests
 * This can be used until a proper testing framework is set up
 */

import { NebiusService, NebiusError } from '../nebius-service';
import { NebiusConfig, MarketData } from '../../../types';

// Simple test framework
class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];
  private passed = 0;
  private failed = 0;

  describe(name: string, fn: () => void) {
    console.log(`\n=== ${name} ===`);
    fn();
  }

  it(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Running Nebius Service Tests...\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ ${test.name}`);
        console.log(`  Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toThrow: (expectedError?: string) => {
        if (typeof actual !== 'function') {
          throw new Error('Expected a function that throws');
        }
        try {
          actual();
          throw new Error('Expected function to throw');
        } catch (error) {
          if (expectedError && !error.message.includes(expectedError)) {
            throw new Error(`Expected error containing "${expectedError}", got "${error.message}"`);
          }
        }
      }
    };
  }
}

// Mock fetch for testing
const mockFetch = (response: any) => {
  global.fetch = jest.fn().mockResolvedValue(response);
};

export { TestRunner, mockFetch };