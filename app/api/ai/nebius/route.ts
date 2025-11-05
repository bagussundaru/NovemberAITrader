import { NextResponse } from "next/server";
import { getNebiusAIService } from '@/lib/ai/nebius-ai-service';

/**
 * GET /api/ai/nebius
 * Test Nebius AI connection and get status
 */
export async function GET() {
  try {
    const nebiusAI = getNebiusAIService();
    
    // Test connection
    const isConnected = await nebiusAI.testConnection();
    
    return NextResponse.json({
      success: true,
      data: {
        connected: isConnected,
        status: isConnected ? 'ACTIVE' : 'DISCONNECTED',
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        fastModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct-fast',
        provider: 'Nebius AI',
        capabilities: [
          'Technical Analysis',
          'Market Sentiment',
          'Risk Assessment',
          'Trading Recommendations'
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error testing Nebius AI:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to test Nebius AI connection",
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/nebius
 * Test Nebius AI analysis with sample data
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, testType } = body;
    
    const nebiusAI = getNebiusAIService();
    
    if (testType === 'analysis' && symbol) {
      // Test with sample market data
      const sampleMarketData = {
        price: 101727,
        change24h: -5.31,
        volume24h: 1370439254,
        high24h: 109300.5,
        low24h: 100829.4
      };
      
      console.log(`🧪 Testing Nebius AI analysis for ${symbol}...`);
      
      const analysis = await nebiusAI.analyzeCryptocurrency(symbol, sampleMarketData);
      
      return NextResponse.json({
        success: true,
        message: "Nebius AI analysis test completed",
        data: {
          testType: 'analysis',
          symbol: symbol,
          analysis: analysis,
          sampleData: sampleMarketData
        },
        timestamp: new Date().toISOString()
      });
      
    } else if (testType === 'sentiment') {
      // Test market sentiment
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
      const marketData = [
        { price: 101727, change24h: -5.31 },
        { price: 3410, change24h: -6.82 },
        { price: 157, change24h: -7.40 }
      ];
      
      console.log('🧪 Testing Nebius AI market sentiment...');
      
      const sentiment = await nebiusAI.getQuickSentiment(symbols, marketData);
      
      return NextResponse.json({
        success: true,
        message: "Nebius AI sentiment test completed",
        data: {
          testType: 'sentiment',
          sentiment: sentiment,
          symbols: symbols,
          marketData: marketData
        },
        timestamp: new Date().toISOString()
      });
      
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid test type or missing symbol",
          validTypes: ['analysis', 'sentiment']
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error in Nebius AI test:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Nebius AI test failed",
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}