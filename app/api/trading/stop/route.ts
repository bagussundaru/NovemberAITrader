import { NextResponse } from "next/server";

/**
 * Stop trading session endpoint
 * Requirements: 5.5, 6.4
 */
export async function POST() {
  try {
    // Get the trading engine instance from the start endpoint
    const tradingEngine = global.tradingEngineInstance;
    
    if (!tradingEngine) {
      return NextResponse.json({
        success: false,
        message: "No active trading session found"
      }, { status: 400 });
    }

    // Stop trading
    await tradingEngine.stopTrading();

    const state = tradingEngine.getState();

    return NextResponse.json({
      success: true,
      message: "Trading session stopped successfully",
      data: {
        isRunning: state.isRunning,
        totalTrades: state.totalTrades,
        activePositions: state.activePositions,
        sessionDuration: state.startTime ? Date.now() - state.startTime.getTime() : 0
      }
    });

  } catch (error) {
    console.error("Error stopping trading session:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to stop trading session",
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * Get trading session status
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
          lastSignalProcessed: null
        }
      });
    }

    const state = tradingEngine.getState();
    const positions = tradingEngine.getActivePositions();

    return NextResponse.json({
      success: true,
      data: {
        ...state,
        positions: positions.length,
        positionDetails: positions
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