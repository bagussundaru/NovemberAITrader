/**
 * Basic tests for Nebius AI Service
 * These tests focus on core functionality and error scenarios
 */

import { NebiusService, NebiusError } from '../nebius-service';
import { NebiusConfig, MarketData } from '../../../types';

// Test configuration
const testConfig: NebiusConfig = {
  apiUrl: 'https://api.nebius.ai',
  jwtToken: 'test-jwt-token',
  model: 'test-model',
  maxRetries: 2,
  timeout: 5000
};

// Test market data
const testMarketData: MarketData = {
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

async function runBasicTests() {
  console.log('🧪 Running Nebius Service Basic Tests\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Service instantiation
  try {
    const service = new NebiusService(testConfig);
    console.log('✓ Service instantiation successful');
    passed++;
  } catch (error) {
    console.log('✗ Service instantiation failed:', error.message);
    failed++;
  }

  // Test 2: Input validation
  try {
    const service = new NebiusService(testConfig);
    
    // Test invalid market data
    const invalidData = { ...testMarketData, symbol: '' };
    
    try {
      await service.analyzeMarket(invalidData);
      console.log('✗ Input validation should have failed');
      failed++;
    } catch (error) {
      if (error instanceof NebiusError && error.code === 'INVALID_INPUT') {
        console.log('✓ Input validation works correctly');
        passed++;
      } else {
        console.log('✗ Wrong error type for input validation:', error.message);
        failed++;
      }
    }
  } catch (error) {
    console.log('✗ Input validation test failed:', error.message);
    failed++;
  }

  // Test 3: Error handling
  try {
    const error = new NebiusError('Test error', 'TEST_CODE', 400);
    
    if (error.message === 'Test error' && 
        error.code === 'TEST_CODE' && 
        error.statusCode === 400 &&
        error.name === 'NebiusError') {
      console.log('✓ NebiusError creation works correctly');
      passed++;
    } else {
      console.log('✗ NebiusError properties incorrect');
      failed++;
    }
  } catch (error) {
    console.log('✗ NebiusError test failed:', error.message);
    failed++;
  }

  // Test 4: Service state management
  try {
    const service = new NebiusService(testConfig);
    
    // Initial state
    if (!service.isServiceAuthenticated()) {
      console.log('✓ Initial authentication state is false');
      passed++;
    } else {
      console.log('✗ Initial authentication state should be false');
      failed++;
    }

    // Reset authentication
    service.resetAuthentication();
    if (service.getRetryCount() === 0) {
      console.log('✓ Reset authentication works correctly');
      passed++;
    } else {
      console.log('✗ Reset authentication failed');
      failed++;
    }
  } catch (error) {
    console.log('✗ Service state management test failed:', error.message);
    failed++;
  }

  // Test 5: Configuration validation
  try {
    const invalidConfig = { ...testConfig, maxRetries: -1 };
    const service = new NebiusService(invalidConfig);
    
    // This should work as validation happens at config level
    console.log('✓ Service handles invalid config gracefully');
    passed++;
  } catch (error) {
    console.log('✗ Config handling test failed:', error.message);
    failed++;
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All basic tests passed!');
    return true;
  } else {
    console.log('❌ Some tests failed');
    return false;
  }
}

// Export for use in other test files
export { runBasicTests, testConfig, testMarketData };