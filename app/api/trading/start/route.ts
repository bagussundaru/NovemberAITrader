import { NextResponse } from "next/server";
import { TradingEngine } from "@/lib/trading-bot/engine";
import { NebiusService } from "@/lib/trading-bot/services/nebius";
import { GateService } from "@/lib/trading-bot/services/gate";
import { MarketDataService } from "@/lib/trading-bot/services/market-data";
import { RiskManagementService } from "@/lib/trading-bot/services/risk-management";

// Declare global trading engine instance
declare global {
  var tradingEngineInstance: TradingEngine | null;
}

/**
 * Start trading session endpoint
 * Requirements: 5.5, 6.4
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tradingPairs, maxConcurrentTrades, enableAutoTrading } = body;

    // Initialize services if not already done
    if (!global.tradingEngineInstance) {
      // In a real implementation, these would be properly initialized with config
      const nebiusService = new NebiusService({
        apiUrl: process.env.NEBIUS_API_URL || '',
        jwtToken: process.env.NEBIUS_JWT_TOKEN || '',
        model: process.env.NEBIUS_MODEL || 'default',
        maxRetries: 3,
        timeout: 30000
      });

      const errorHandler = {
        logError: (error: Error, context: string) => {
          console.error(`[${context}] ${error.message}`, error);
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

      const gateService = new GateService({
        baseUrl: 'https://fx-api-testnet.gateio.ws',
        apiKey: process.env.GATE_API_KEY || '',
        apiSecret: process.env.GATE_API_SECRET || '',
        testnet: true
      }, errorHandler);

      const marketDataService = new MarketDataService({
        updateInterval: 5000,
        maxHistoryLength: 100,
        enableRealTimeUpdates: true,
        tradingPairs: tradingPairs || ['BTC/USDT', 'ETH/USDT'],
        technicalIndicatorsPeriods: {
          rsi: 14,
          macd: {
            fast: 12,
            slow: 26,
            signal: 9
          },
          movingAverage: 20
        }
      }, gateService, errorHandler);

      const riskService = new RiskManagementService({
        maxDailyLoss: 1000,
        maxPositionSize: 500,
        stopLossPercentage: 0.05,
        maxOpenPositions: 5,
        emergencyStopEnabled: true
      }, errorHandler);

      global.tradingEngineInstance = new TradingEngine(
        {
          tradingPairs: tradingPairs || ['BTC/USDT', 'ETH/USDT'],
          marketDataUpdateInterval: 5000,
          nebius: {
            apiUrl: process.env.NEBIUS_API_URL || '',
            jwtToken: process.env.NEBIUS_JWT_TOKEN || '',
            model: process.env.NEBIUS_MODEL || 'default',
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
            maxDailyLoss: 1000,
            maxPositionSize: 500,
            stopLossPercentage: 0.05,
            maxOpenPositions: 5,
            emergencyStopEnabled: true
          }
        },
        {
          nebiusService,
          gateService,
          marketDataService,
          riskService,
          errorHandler
        },
        {
          tradingPairs: tradingPairs || ['BTC/USDT', 'ETH/USDT'],
          maxConcurrentTrades: maxConcurrentTrades || 5,
          signalProcessingInterval: 30000,
          positionUpdateInterval: 10000,
          enableAutoTrading: enableAutoTrading !== false
        }
      );
    }

    // Start trading
    await global.tradingEngineInstance.startTrading();

    const state = global.tradingEngineInstance.getState();

    return NextResponse.json({
      success: true,
      message: "Trading session started successfully",
      data: {
        isRunning: state.isRunning,
        startTime: state.startTime,
        tradingPairs: tradingPairs || ['BTC/USDT', 'ETH/USDT'],
        config: {
          maxConcurrentTrades: maxConcurrentTrades || 5,
          enableAutoTrading: enableAutoTrading !== false
        }
      }
    });

  } catch (error) {
    console.error("Error starting trading session:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to start trading session",
      error: (error as Error).message
    }, { status: 500 });
  }
}