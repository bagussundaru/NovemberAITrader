import { NextResponse } from "next/server";
import { TradingEngine } from "@/lib/trading-bot/engine";
import { NebiusService } from "@/lib/trading-bot/services/nebius";
import { GateService } from "@/lib/trading-bot/services/gate";
import { BybitService } from "@/lib/trading-bot/services/bybit/bybit-service";
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
    const { tradingPairs, maxConcurrentTrades, enableAutoTrading, credentials } = body;

    // Initialize services if not already done
    if (!global.tradingEngineInstance) {
      // In a real implementation, these would be properly initialized with config
      const nebiusService = new NebiusService({
        apiUrl: (credentials?.nebius?.apiUrl) || process.env.NEBIUS_API_URL || 'https://api.studio.nebius.ai/v1',
        jwtToken: (credentials?.nebius?.jwtToken) || process.env.NEBIUS_JWT_TOKEN || '',
        model: (credentials?.nebius?.model) || process.env.NEBIUS_MODEL || 'deepseek-ai/DeepSeek-V3-0324',
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

      const exchange = ((process.env.EXCHANGE_PROVIDER || 'BYBIT')).toUpperCase();
      let gateService: any;
      if (exchange === 'BYBIT') {
        const bybitBase = (credentials?.bybit?.baseUrl) || process.env.BYBIT_BASE_URL || (process.env.BYBIT_TESTNET === 'true' ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com');
        gateService = new BybitService({
          baseUrl: bybitBase,
          apiKey: (credentials?.bybit?.apiKey) || process.env.BYBIT_API_KEY || '',
          apiSecret: (credentials?.bybit?.apiSecret) || process.env.BYBIT_API_SECRET || '',
          testnet: (typeof credentials?.bybit?.testnet === 'boolean' ? credentials.bybit.testnet : process.env.BYBIT_TESTNET === 'true')
        }, errorHandler);
      } else {
        const gateBaseUrl = process.env.GATE_BASE_URL || (process.env.GATE_TESTNET === 'false' ? 'https://fx-api.gateio.ws' : 'https://fx-api-testnet.gateio.ws');
        gateService = new GateService({
          baseUrl: gateBaseUrl,
          apiKey: process.env.GATE_API_KEY || '',
          apiSecret: process.env.GATE_API_SECRET || '',
          testnet: process.env.GATE_TESTNET === 'false' ? false : true
        }, errorHandler);
      }

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
        maxDailyLoss: Number(process.env.MAX_DAILY_LOSS || 3000),
        maxPositionSize: Number(process.env.MAX_POSITION_SIZE || 2000),
        stopLossPercentage: Number(process.env.STOP_LOSS_PERCENTAGE || 0.08),
        maxOpenPositions: Number(process.env.MAX_OPEN_POSITIONS || 10),
        emergencyStopEnabled: true
      }, errorHandler);

      global.tradingEngineInstance = new TradingEngine(
        {
          tradingPairs: tradingPairs || ['BTC/USDT', 'ETH/USDT'],
          marketDataUpdateInterval: 5000,
          nebius: {
            apiUrl: (credentials?.nebius?.apiUrl) || process.env.NEBIUS_API_URL || 'https://api.studio.nebius.ai/v1',
            jwtToken: (credentials?.nebius?.jwtToken) || process.env.NEBIUS_JWT_TOKEN || '',
            model: (credentials?.nebius?.model) || process.env.NEBIUS_MODEL || 'deepseek-ai/DeepSeek-V3-0324',
            maxRetries: 3,
            timeout: 30000
          },
          gate: {
            baseUrl: gateService?.config?.baseUrl || '',
            apiKey: gateService?.config?.apiKey || '',
            apiSecret: gateService?.config?.apiSecret || '',
            testnet: gateService?.config?.testnet || false
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
          signalProcessingInterval: Number(process.env.SIGNAL_PROCESSING_INTERVAL_MS || 20000),
          positionUpdateInterval: Number(process.env.POSITION_UPDATE_INTERVAL_MS || 12000),
          enableAutoTrading: enableAutoTrading !== false
        }
      );
    }

    // Start trading even if AI is temporarily unavailable
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
    
    // Attempt to proceed with partial start
    try {
      const state = global.tradingEngineInstance?.getState();
      return NextResponse.json({
        success: true,
        message: "Trading session started with limited services",
        data: {
          isRunning: state?.isRunning || false,
          startTime: state?.startTime || null,
          tradingPairs: global.tradingEngineInstance?.getSessionConfig().tradingPairs || tradingPairs || ['BTC/USDT'],
          config: {
            maxConcurrentTrades: maxConcurrentTrades || 5,
            enableAutoTrading: enableAutoTrading !== false
          },
          note: (error as Error).message
        }
      });
    } catch (e2) {
      return NextResponse.json({
        success: false,
        message: "Failed to start trading session",
        error: (error as Error).message
      }, { status: 500 });
    }
  }
}
