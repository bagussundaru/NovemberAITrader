// API endpoint for end-to-end trading workflow validation
// Requirements: 1.1, 2.1, 3.1, 4.1

import { NextResponse } from "next/server";
import { EndToEndTradingWorkflow, EndToEndTestConfig } from "@/lib/trading-bot/integration/end-to-end-workflow";
import { NebiusService } from "@/lib/trading-bot/services/nebius";
import { GateService } from "@/lib/trading-bot/services/gate";
import { MarketDataService } from "@/lib/trading-bot/services/market-data";
import { RiskManagementService } from "@/lib/trading-bot/services/risk-management";
import { DatabaseService } from "@/lib/trading-bot/database";
import { TradingBotConfig, ErrorHandler } from "@/lib/trading-bot/types";

/**
 * POST /api/trading/validate-workflow
 * Validates the complete end-to-end trading workflow
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      testDuration = 15000,
      tradingPairs = ['BTC/USDT'],
      enableRealTrading = false,
      mockMode = true,
      validationSteps = [
        'Service Authentication',
        'Market Data Flow',
        'AI Analysis Flow',
        'Risk Management',
        'Trade Execution',
        'Database Integration',
        'Complete Trading Session',
        'Error Handling & Recovery'
      ]
    } = body;

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

    // Initialize configuration
    const config: TradingBotConfig = {
      tradingPairs,
      marketDataUpdateInterval: 5000,
      nebius: {
        apiUrl: process.env.NEBIUS_API_URL || 'https://api.nebius.ai',
        jwtToken: process.env.NEBIUS_JWT_TOKEN || '',
        model: process.env.NEBIUS_MODEL || 'trading-v1',
        maxRetries: 3,
        timeout: 30000
      },
      gate: {
        baseUrl: 'https://fx-api-testnet.gateio.ws',
        apiKey: process.env.GATE_API_KEY || '',
        apiSecret: process.env.GATE_API_SECRET || '',
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

    // Initialize services
    const nebiusService = new NebiusService(config.nebius);
    const gateService = new GateService(config.gate, errorHandler);
    
    const marketDataService = new MarketDataService({
      updateInterval: 5000,
      maxHistoryLength: 100,
      enableRealTimeUpdates: true,
      tradingPairs: config.tradingPairs,
      technicalIndicatorsPeriods: {
        rsi: 14,
        macd: { fast: 12, slow: 26, signal: 9 },
        movingAverage: 20
      }
    }, gateService, errorHandler);

    const riskService = new RiskManagementService(config.risk, errorHandler);
    const databaseService = DatabaseService.getInstance();

    // Initialize workflow
    const workflow = new EndToEndTradingWorkflow(config, {
      nebiusService,
      gateService,
      marketDataService,
      riskService,
      databaseService,
      errorHandler
    });

    // Configure test parameters
    const testConfig: EndToEndTestConfig = {
      testDuration: Math.min(testDuration, 60000), // Max 60 seconds
      tradingPairs,
      enableRealTrading,
      validationSteps,
      mockMode
    };

    console.log('Starting end-to-end workflow validation...');
    console.log('Test configuration:', testConfig);

    // Execute workflow validation
    const results = await workflow.executeEndToEndWorkflow(testConfig);
    const summary = workflow.getValidationSummary();

    // Cleanup
    await databaseService.disconnect();

    console.log('Workflow validation completed');
    console.log('Summary:', summary);

    return NextResponse.json({
      success: true,
      message: "End-to-end workflow validation completed",
      data: {
        summary,
        results: results.map(r => ({
          stage: r.stage,
          success: r.success,
          message: r.message,
          timestamp: r.timestamp,
          data: r.data,
          error: r.error
        })),
        configuration: {
          testDuration: testConfig.testDuration,
          tradingPairs: testConfig.tradingPairs,
          enableRealTrading: testConfig.enableRealTrading,
          mockMode: testConfig.mockMode,
          validationSteps: testConfig.validationSteps
        },
        environment: {
          hasNebiusCredentials: !!process.env.NEBIUS_JWT_TOKEN,
          hasGateCredentials: !!process.env.GATE_API_KEY,
          nodeEnv: process.env.NODE_ENV
        }
      }
    });

  } catch (error) {
    console.error("Error in workflow validation:", error);
    
    return NextResponse.json({
      success: false,
      message: "End-to-end workflow validation failed",
      error: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    }, { status: 500 });
  }
}

/**
 * GET /api/trading/validate-workflow
 * Get information about workflow validation capabilities
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: "End-to-end workflow validation endpoint",
      data: {
        description: "Validates the complete trading bot pipeline from market data to trade execution",
        availableValidationSteps: [
          'Service Authentication',
          'Market Data Flow',
          'AI Analysis Flow',
          'Risk Management',
          'Trade Execution',
          'Database Integration',
          'Complete Trading Session',
          'Error Handling & Recovery'
        ],
        supportedTradingPairs: ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT'],
        configuration: {
          maxTestDuration: 60000, // 60 seconds
          defaultTestDuration: 15000, // 15 seconds
          mockModeAvailable: true,
          realTradingAvailable: true
        },
        requirements: {
          nebiusCredentials: !!process.env.NEBIUS_JWT_TOKEN,
          gateCredentials: !!process.env.GATE_API_KEY,
          databaseConnection: true
        }
      }
    });

  } catch (error) {
    console.error("Error getting workflow validation info:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to get workflow validation information",
      error: (error as Error).message
    }, { status: 500 });
  }
}