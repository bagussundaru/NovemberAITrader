import { NextResponse } from "next/server";
import { runAIAnalysis } from '@/lib/ai/run';

// In-memory cache for analysis results
let cachedAnalysis: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/ai/analysis
 * Get latest AI analysis results
 */
export async function GET() {
  try {
    // Check if we have cached data that's still fresh
    const now = Date.now();
    if (cachedAnalysis && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cachedAnalysis,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // If no cached data or cache expired, run fresh analysis
    console.log("Running fresh AI analysis...");
    const analysisResult = await runAIAnalysis();
    
    // Cache the result
    cachedAnalysis = analysisResult;
    cacheTimestamp = now;

    return NextResponse.json({
      success: true,
      data: analysisResult,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching AI analyses:", error);
    
    // Return cached data if available, even if stale
    if (cachedAnalysis) {
      return NextResponse.json({
        success: true,
        data: cachedAnalysis,
        cached: true,
        stale: true,
        error: "Fresh analysis failed, returning cached data",
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch AI analyses",
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/analysis
 * Trigger new AI analysis
 */
export async function POST() {
  try {
    console.log("🚀 Triggering new AI analysis...");
    
    const analysisResult = await runAIAnalysis();
    
    return NextResponse.json({
      success: true,
      message: "AI analysis completed successfully",
      data: analysisResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error running AI analysis:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to run AI analysis",
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}