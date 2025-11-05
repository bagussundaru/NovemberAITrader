import { NextResponse } from "next/server";

/**
 * Get trading configuration endpoint
 * Requirements: 5.5, 6.4
 */
export async function GET() {
  try {
    const tradingEngine = global.tradingEngineInstance;
    
    const defaultConfig = {
      tradingPairs: ['BTC/USDT', 'ETH/USDT'],
      maxConcurrentTrades: 5,
      signalProcessingInterval: 30000,
      positionUpdateInterval: 10000,
      enableAutoTrading: true,
      riskConfig: {
        maxDailyLoss: 1000,
        maxPositionSize: 500,
        stopLossPercentage: 0.05,
        maxOpenPositions: 5,
        emergencyStopEnabled: true
      },
      nebiusConfig: {
        model: process.env.NEBIUS_MODEL || 'default',
        maxRetries: 3,
        timeout: 30000
      }
    };
    
    if (!tradingEngine) {
      return NextResponse.json({
        success: true,
        data: defaultConfig
      });
    }

    // Get current configuration from trading engine
    const state = tradingEngine.getState();
    const sessionConfig = tradingEngine.getSessionConfig();
    
    return NextResponse.json({
      success: true,
      data: {
        ...defaultConfig,
        ...sessionConfig,
        isRunning: state.isRunning,
        startTime: state.startTime
      }
    });

  } catch (error) {
    console.error("Error getting trading configuration:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to get trading configuration",
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * Update trading configuration endpoint
 * Requirements: 5.5, 6.4
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const tradingEngine = global.tradingEngineInstance;
    
    if (!tradingEngine) {
      return NextResponse.json({
        success: false,
        message: "No active trading session to configure"
      }, { status: 400 });
    }

    // Validate configuration
    const validConfig = validateTradingConfig(body);
    if (!validConfig.isValid) {
      return NextResponse.json({
        success: false,
        message: "Invalid configuration",
        errors: validConfig.errors
      }, { status: 400 });
    }

    // Update session configuration
    tradingEngine.updateSessionConfig(body);

    return NextResponse.json({
      success: true,
      message: "Trading configuration updated successfully",
      data: body
    });

  } catch (error) {
    console.error("Error updating trading configuration:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to update trading configuration",
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * Validate trading configuration
 */
function validateTradingConfig(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.tradingPairs && !Array.isArray(config.tradingPairs)) {
    errors.push("tradingPairs must be an array");
  }

  if (config.maxConcurrentTrades && (typeof config.maxConcurrentTrades !== 'number' || config.maxConcurrentTrades < 1)) {
    errors.push("maxConcurrentTrades must be a positive number");
  }

  if (config.signalProcessingInterval && (typeof config.signalProcessingInterval !== 'number' || config.signalProcessingInterval < 1000)) {
    errors.push("signalProcessingInterval must be at least 1000ms");
  }

  if (config.positionUpdateInterval && (typeof config.positionUpdateInterval !== 'number' || config.positionUpdateInterval < 1000)) {
    errors.push("positionUpdateInterval must be at least 1000ms");
  }

  if (config.enableAutoTrading !== undefined && typeof config.enableAutoTrading !== 'boolean') {
    errors.push("enableAutoTrading must be a boolean");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}