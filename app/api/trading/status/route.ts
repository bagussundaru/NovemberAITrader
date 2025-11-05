import { NextResponse } from "next/server";

/**
 * Get comprehensive trading status endpoint
 * Requirements: 5.1, 5.5
 */
export async function GET() {
  try {
    const tradingEngine = global.tradingEngineInstance;
    
    if (!tradingEngine) {
      return NextResponse.json({
        success: true,
        data: {
          isRunning: false,
          startTime: null,
          totalTrades: 0,
          activePositions: 0,
          lastMarketUpdate: null,
          lastSignalProcessed: null,
          positions: [],
          marketData: {},
          recoveryStatus: {
            connectionStatus: {},
            errorStatistics: {},
            isInRecoveryMode: false,
            systemState: {}
          }
        }
      });
    }

    const state = tradingEngine.getState();
    const positions = tradingEngine.getActivePositions();
    const marketData = tradingEngine.getMarketData();
    const recoveryStatus = tradingEngine.getRecoveryStatus();

    return NextResponse.json({
      success: true,
      data: {
        ...state,
        positions,
        marketData: marketData instanceof Map ? Object.fromEntries(marketData) : marketData,
        recoveryStatus
      }
    });

  } catch (error) {
    console.error("Error getting trading status:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to get trading status",
      error: (error as Error).message
    }, { status: 500 });
  }
}