import { NextResponse } from "next/server";
import { getTradingEngine } from '@/lib/trading-engine/trading-engine';

/**
 * GET /api/trading/engine
 * Get trading engine status and performance
 */
export async function GET() {
  try {
    const engine = getTradingEngine();
    const state = engine.getState();
    const performance = await engine.getPerformanceStats();
    
    return NextResponse.json({
      success: true,
      data: {
        status: state.isRunning ? 'ACTIVE' : 'INACTIVE',
        state: state,
        performance: performance,
        config: state.config
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error getting trading engine status:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to get trading engine status",
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trading/engine
 * Control trading engine (start/stop)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config } = body;
    
    const engine = getTradingEngine();
    
    switch (action) {
      case 'start':
        await engine.start();
        return NextResponse.json({
          success: true,
          message: "Trading engine started successfully",
          data: engine.getState(),
          timestamp: new Date().toISOString()
        });
        
      case 'stop':
        await engine.stop();
        return NextResponse.json({
          success: true,
          message: "Trading engine stopped successfully",
          data: engine.getState(),
          timestamp: new Date().toISOString()
        });
        
      case 'config':
        if (config) {
          await engine.updateConfig(config);
          return NextResponse.json({
            success: true,
            message: "Trading engine config updated",
            data: engine.getState(),
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error('Config data required for config action');
        }
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error("Error controlling trading engine:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to control trading engine",
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}