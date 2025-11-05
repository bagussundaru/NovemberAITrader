import { NextResponse } from "next/server";

/**
 * Get current trading positions endpoint
 * Requirements: 5.2
 */
export async function GET() {
  try {
    const tradingEngine = global.tradingEngineInstance;
    
    if (!tradingEngine) {
      return NextResponse.json({
        success: true,
        data: {
          positions: [],
          totalValue: 0,
          totalPnL: 0,
          count: 0
        }
      });
    }

    const positions = tradingEngine.getActivePositions();
    
    // Calculate totals
    let totalValue = 0;
    let totalPnL = 0;
    
    for (const position of positions) {
      const positionValue = position.amount * position.currentPrice;
      totalValue += positionValue;
      totalPnL += position.unrealizedPnL;
    }

    return NextResponse.json({
      success: true,
      data: {
        positions,
        totalValue,
        totalPnL,
        count: positions.length,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error getting positions:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to get positions",
      error: (error as Error).message
    }, { status: 500 });
  }
}