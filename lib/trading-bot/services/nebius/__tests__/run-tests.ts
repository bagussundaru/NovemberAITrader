#!/usr/bin/env node

/**
 * Test runner script for Nebius AI Service
 * Run with: npx ts-node lib/trading-bot/services/nebius/__tests__/run-tests.ts
 */

import { runBasicTests } from './basic-tests';

async function main() {
  console.log('🚀 Starting Nebius AI Service Test Suite\n');
  
  try {
    const success = await runBasicTests();
    
    if (success) {
      console.log('\n✅ All tests completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}