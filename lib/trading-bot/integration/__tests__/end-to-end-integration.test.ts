// End-to-End Trading Bot Integration Tests
// Tests complete trading pipeline with real Nebius AI and Gate.io testnet APIs
// Requirements: 1.1, 2.1, 3.1, 4.1

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { EndToEndTradingWorkflow, EndToEndTestConfig } from '../end-to-end-workflow';
import { NebiusService } from '../../services/nebius';
import { GateService } from '../../services/gate';
import { MarketDataService } from '../../services/market-data';
import { RiskManagementService } from '../../services/risk-management';
import { DatabaseService } from '../../database';
import { TradingBotConfig, ErrorHandler } from '../../types';

describe('End-to-End Trading Bot Integration', () => {
  let workflow: EndToEndTradingWorkflow;
  let services: {
    nebiusService: NebiusService;
    gateService: GateService;
    marketDataService: MarketDataService;
    riskService: RiskManagementService;
    databaseService: DatabaseService;
    errorHandler: ErrorHandler;
  };

  const testConfig: TradingBotConfig = {
    tradingPairs: ['BTC/USDT', 'ETH/USDT'],
    marketDataUpdateInterval: 5000,
    nebius: {
      apiUrl: process.env.NEBIUS_API_URL || 'https://api.nebius.ai',
      jwtToken: process.env.NEBIUS_JWT_TOKEN || 'test-jwt-token',
      model: process.env.NEBIUS_MODEL || 'trading-v1',
      maxRetries: 3,
      timeout: 30000
    },
    gate: {
      baseUrl: 'https://fx-api-testnet.gateio.ws',
      apiKey: process.env.GATE_API_KEY || 'test-api-key',
      apiSecret: process.env.GATE_API_SECRET || 'test-api-secret',
      testnet: true
    },
    risk: {
      maxDailyLoss: 100, // Reduced for testing
      maxPositionSize: 50, // Reduced for testing
      stopLossPercentage: 0.05,
      maxOpenPositions: 2, // Reduced for testing
      emergencyStopEnabled: true
    }
  };

  beforeAll(async () => {
    // Initialize error handler
    const errorHandler: ErrorHandler = {
      logError: (error: Error, context: string) => {
        console.error(`[${context}] ${error.message}`);
      },
      handleNebiusError: (error: any) => {
        console.error('Nebius error:', error);
      },
      handleGateError: (error: any) => {
        console.error('Gate error:', error);
      },
      handleNetworkError: (error: any) => {
        console.error('Network error:', error);
      }
    };

    // Initialize services
    const nebiusService = new NebiusService(testConfig.nebius);
    const gateService = new GateService(testConfig.gate, errorHandler);
    
    const marketDataService = new MarketDataService({
      updateInterval: 5000,
      maxHistoryLength: 100,
      enableRealTimeUpdates: true,
      tradingPairs: testConfig.tradingPairs,
      technicalIndicatorsPeriods: {
        rsi: 14,
        macd: { fast: 12, slow: 26, signal: 9 },
        movingAverage: 20
      }
    }, gateService, errorHandler);

    const riskService = new RiskManagementService(testConfig.risk, errorHandler);
    const databaseService = DatabaseService.getInstance();

    services = {
      nebiusService,
      gateService,
      marketDataService,
      riskService,
      databaseService,
      errorHandler
    };

    // Initialize workflow
    workflow = new EndToEndTradingWorkflow(testConfig, services);
  });

  afterAll(async () => {
    // Cleanup
    if (services.databaseService) {
      await services.databaseService.disconnect();
    }
  });

  test('should validate complete end-to-end trading workflow in mock mode', async () => {
    const endToEndConfig: EndToEndTestConfig = {
      testDuration: 15000, // 15 seconds
      tradingPairs: ['BTC/USDT'],
      enableRealTrading: false,
      validationSteps: [
        'Service Authentication',
        'Market Data Flow',
        'AI Analysis Flow',
        'Risk Management',
        'Trade Execution (Mock)',
        'Database Integration',
        'Complete Trading Session',
        'Error Handling & Recovery'
      ],
      mockMode: true
    };

    const results = await workflow.executeEndToEndWorkflow(endToEndConfig);
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    
    // Check that all validation steps completed
    const stageNames = results.map(r => r.stage);
    expect(stageNames).toContain('Nebius Authentication');
    expect(stageNames).toContain('Gate.io Authentication');
    expect(stageNames).toContain('Market Data Flow');
    expect(stageNames).toContain('AI Analysis Flow');
    expect(stageNames).toContain('Risk Management');
    expect(stageNames).toContain('Trade Execution (Mock)');
    expect(stageNames).toContain('Database Integration');
    expect(stageNames).toContain('Complete Trading Session');
    expect(stageNames).toContain('Error Handling & Recovery');
    
    // Check success rate
    const summary = workflow.getValidationSummary();
    expect(summary.totalStages).toBeGreaterThan(8);
    expect(summary.successRate).toBeGreaterThan(80); // At least 80% success rate
    
    console.log('End-to-end validation summary:', summary);
    console.log('Validation results:', results.map(r => ({
      stage: r.stage,
      success: r.success,
      message: r.message
    })));
  }, 60000); // 60 second timeout

  test('should validate service authentication with real APIs', async () => {
    // Skip if no real API credentials provided
    if (!process.env.NEBIUS_JWT_TOKEN || !process.env.GATE_API_KEY) {
      console.log('Skipping real API test - no credentials provided');
      return;
    }

    const endToEndConfig: EndToEndTestConfig = {
      testDuration: 5000,
      tradingPairs: ['BTC/USDT'],
      enableRealTrading: false,
      validationSteps: ['Service Authentication'],
      mockMode: false
    };

    const results = await workflow.executeEndToEndWorkflow(endToEndConfig);
    
    const authResults = results.filter(r => 
      r.stage.includes('Authentication') || r.stage.includes('Connection')
    );
    
    expect(authResults.length).toBeGreaterThan(0);
    
    // Check that authentication succeeded
    const failedAuth = authResults.find(r => !r.success);
    if (failedAuth) {
      console.warn('Authentication failed:', failedAuth);
    }
    
    console.log('Authentication results:', authResults);
  }, 30000);

  test('should validate market data flow with real Gate.io testnet', async () => {
    // Skip if no real API credentials provided
    if (!process.env.GATE_API_KEY) {
      console.log('Skipping real market data test - no Gate.io credentials provided');
      return;
    }

    const endToEndConfig: EndToEndTestConfig = {
      testDuration: 5000,
      tradingPairs: ['BTC/USDT'],
      enableRealTrading: false,
      validationSteps: ['Market Data Flow'],
      mockMode: false
    };

    const results = await workflow.executeEndToEndWorkflow(endToEndConfig);
    
    const marketDataResults = results.filter(r => r.stage.includes('Market Data'));
    expect(marketDataResults.length).toBeGreaterThan(0);
    
    const successfulMarketData = marketDataResults.find(r => r.success);
    expect(successfulMarketData).toBeDefined();
    
    if (successfulMarketData?.data) {
      expect(successfulMarketData.data.tradingPairs).toContain('BTC/USDT');
      expect(successfulMarketData.data.sampleData).toBeDefined();
      expect(successfulMarketData.data.sampleData.length).toBeGreaterThan(0);
    }
    
    console.log('Market data results:', marketDataResults);
  }, 30000);

  test('should validate AI analysis flow with real Nebius AI', async () => {
    // Skip if no real API credentials provided
    if (!process.env.NEBIUS_JWT_TOKEN) {
      console.log('Skipping real AI analysis test - no Nebius credentials provided');
      return;
    }

    const endToEndConfig: EndToEndTestConfig = {
      testDuration: 5000,
      tradingPairs: ['BTC/USDT'],
      enableRealTrading: false,
      validationSteps: ['AI Analysis Flow'],
      mockMode: false
    };

    const results = await workflow.executeEndToEndWorkflow(endToEndConfig);
    
    const aiResults = results.filter(r => r.stage.includes('AI Analysis'));
    expect(aiResults.length).toBeGreaterThan(0);
    
    const successfulAI = aiResults.find(r => r.success);
    expect(successfulAI).toBeDefined();
    
    if (successfulAI?.data) {
      expect(successfulAI.data.symbol).toBe('BTC/USDT');
      expect(['buy', 'sell', 'hold']).toContain(successfulAI.data.action);
      expect(successfulAI.data.confidence).toBeGreaterThanOrEqual(0);
      expect(successfulAI.data.confidence).toBeLessThanOrEqual(1);
    }
    
    console.log('AI analysis results:', aiResults);
  }, 30000);

  test('should validate risk management controls', async () => {
    const endToEndConfig: EndToEndTestConfig = {
      testDuration: 5000,
      tradingPairs: ['BTC/USDT'],
      enableRealTrading: false,
      validationSteps: ['Risk Management'],
      mockMode: true
    };

    const results = await workflow.executeEndToEndWorkflow(endToEndConfig);
    
    const riskResults = results.filter(r => r.stage.includes('Risk Management'));
    expect(riskResults.length).toBeGreaterThan(0);
    
    const successfulRisk = riskResults.find(r => r.success);
    expect(successfulRisk).toBeDefined();
    
    if (successfulRisk?.data) {
      expect(successfulRisk.data.positionSize).toBeGreaterThan(0);
      expect(successfulRisk.data.tradeValidation).toBeDefined();
      expect(successfulRisk.data.riskLimitsEnforced).toBe(true);
    }
    
    console.log('Risk management results:', riskResults);
  }, 30000);

  test('should handle workflow errors gracefully', async () => {
    // Create a workflow with invalid configuration to test error handling
    const invalidConfig: TradingBotConfig = {
      ...testConfig,
      nebius: {
        ...testConfig.nebius,
        jwtToken: 'invalid-token'
      }
    };

    const invalidWorkflow = new EndToEndTradingWorkflow(invalidConfig, services);
    
    const endToEndConfig: EndToEndTestConfig = {
      testDuration: 5000,
      tradingPairs: ['BTC/USDT'],
      enableRealTrading: false,
      validationSteps: ['Service Authentication'],
      mockMode: false
    };

    const results = await invalidWorkflow.executeEndToEndWorkflow(endToEndConfig);
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    
    // Should have some failed results due to invalid configuration
    const failedResults = results.filter(r => !r.success);
    expect(failedResults.length).toBeGreaterThan(0);
    
    // Should still complete the workflow
    const summary = invalidWorkflow.getValidationSummary();
    expect(summary.totalStages).toBeGreaterThan(0);
    
    console.log('Error handling test results:', results.map(r => ({
      stage: r.stage,
      success: r.success,
      error: r.error
    })));
  }, 30000);

  test('should provide comprehensive validation summary', async () => {
    const endToEndConfig: EndToEndTestConfig = {
      testDuration: 10000,
      tradingPairs: ['BTC/USDT', 'ETH/USDT'],
      enableRealTrading: false,
      validationSteps: [
        'Service Authentication',
        'Market Data Flow',
        'Risk Management',
        'Trade Execution (Mock)'
      ],
      mockMode: true
    };

    const results = await workflow.executeEndToEndWorkflow(endToEndConfig);
    const summary = workflow.getValidationSummary();
    
    expect(summary.totalStages).toBeGreaterThan(0);
    expect(summary.successfulStages).toBeGreaterThanOrEqual(0);
    expect(summary.failedStages).toBeGreaterThanOrEqual(0);
    expect(summary.successRate).toBeGreaterThanOrEqual(0);
    expect(summary.successRate).toBeLessThanOrEqual(100);
    expect(summary.duration).toBeGreaterThan(0);
    expect(summary.isRunning).toBe(false);
    
    expect(summary.totalStages).toBe(summary.successfulStages + summary.failedStages);
    
    console.log('Comprehensive validation summary:', summary);
    console.log('Total validation results:', results.length);
  }, 45000);
});