import { NextResponse } from "next/server";

/**
 * Emergency stop endpoint - immediately halt all trading activities
 * Requirements: 6.4
 */
export async function POST() {
  try {
    const tradingEngine = global.tradingEngineInstance;
    
    if (!tradingEngine) {
      return NextResponse.json({
        success: false,
        message: "No active trading session found"
      }, { status: 400 });
    }

    // Emergency stop - force stop all trading activities
    await tradingEngine.stopTrading();
    
    // Clear the global instance to prevent restart
    global.tradingEngineInstance = null;

    return NextResponse.json({
      success: true,
      message: "Emergency stop executed successfully",
      data: {
        timestamp: new Date().toISOString(),
        action: "emergency_stop"
      }
    });

  } catch (error) {
    console.error("Error executing emergency stop:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to execute emergency stop",
      error: (error as Error).message
    }, { status: 500 });
  }
}