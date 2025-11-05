# Nebius AI Service Tests

This directory contains unit tests for the Nebius AI service implementation.

## Test Files

- `nebius-service.test.ts` - Comprehensive Jest-based unit tests
- `basic-tests.ts` - Simple Node.js tests that can run without external frameworks
- `run-tests.ts` - Test runner script
- `test-runner.ts` - Simple test framework utilities

## Running Tests

### Option 1: With Jest (Recommended)
```bash
# Install Jest and dependencies
npm install --save-dev jest @types/jest ts-jest

# Run tests
npm test
```

### Option 2: Basic Tests (No dependencies)
```bash
# Run basic tests with Node.js
npx ts-node lib/trading-bot/services/nebius/__tests__/run-tests.ts
```

## Test Coverage

The tests cover the following scenarios:

### Authentication Flow
- ✅ Successful JWT authentication
- ✅ Authentication failure handling
- ✅ Network error during authentication
- ✅ Authentication retry delay enforcement
- ✅ Token refresh and persistence

### Market Analysis
- ✅ Successful market data analysis
- ✅ Input validation (symbol, price, timestamp)
- ✅ API response parsing
- ✅ Invalid response handling
- ✅ Rate limiting detection and handling
- ✅ Server error retry logic
- ✅ Authentication expiry during analysis

### Error Scenarios
- ✅ Network timeouts
- ✅ Invalid API responses
- ✅ Rate limit exceeded
- ✅ Server errors (500, 502, 503)
- ✅ Authentication failures (401, 403)
- ✅ Bad requests (400)

### Service State Management
- ✅ Authentication state tracking
- ✅ Retry count management
- ✅ Service reset functionality

## Mock Data

The tests use realistic mock data that matches the expected API formats:

```typescript
const mockMarketData = {
  symbol: 'BTC/USDT',
  timestamp: Date.now(),
  price: 50000,
  volume: 1000,
  orderBook: { bids: [...], asks: [...] },
  indicators: { rsi: 65, macd: 0.5, movingAverage: 49500 }
};
```

## Requirements Coverage

These tests satisfy the following requirements:
- **1.1**: JWT authentication flow testing
- **1.2**: Market analysis request handling
- **1.3**: AI response parsing and validation
- **1.4**: Connection management and retry logic
- **1.5**: Token refresh and persistence