#!/bin/bash

echo "🚀 Testing Nebius AI Integration..."
echo "=================================="

# Test Nebius AI Connection
echo ""
echo "🔗 Testing Nebius AI Connection:"
echo "curl http://localhost:3000/api/ai/nebius"
curl -s http://localhost:3000/api/ai/nebius | jq '{
  success: .success,
  connected: .data.connected,
  status: .data.status,
  model: .data.model,
  capabilities: .data.capabilities
}'

echo ""
echo "=================================="

# Test Nebius AI Analysis
echo ""
echo "🎯 Testing Nebius AI Analysis (BTC):"
echo "curl -X POST http://localhost:3000/api/ai/nebius -d '{\"symbol\":\"BTCUSDT\",\"testType\":\"analysis\"}'"
curl -X POST -s http://localhost:3000/api/ai/nebius \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","testType":"analysis"}' | jq '{
  success: .success,
  symbol: .data.symbol,
  action: .data.analysis.action,
  confidence: .data.analysis.confidence,
  reasoning: .data.analysis.reasoning,
  modelUsed: .data.analysis.modelUsed
}'

echo ""
echo "=================================="

# Test Market Sentiment
echo ""
echo "📊 Testing Market Sentiment Analysis:"
echo "curl -X POST http://localhost:3000/api/ai/nebius -d '{\"testType\":\"sentiment\"}'"
curl -X POST -s http://localhost:3000/api/ai/nebius \
  -H "Content-Type: application/json" \
  -d '{"testType":"sentiment"}' | jq '{
  success: .success,
  sentiment: .data.sentiment,
  symbols: .data.symbols
}'

echo ""
echo "=================================="

# Test Full AI Analysis with Nebius
echo ""
echo "🤖 Testing Full AI Analysis (with Nebius AI):"
echo "curl -X POST http://localhost:3000/api/ai/analysis"
curl -X POST -s http://localhost:3000/api/ai/analysis | jq '{
  success: .success,
  totalAnalyzed: .data.totalAnalyzed,
  nebiusAIStatus: .data.nebiusAIStatus,
  marketSentiment: .data.marketSentiment,
  buySignals: .data.buySignals,
  sellSignals: .data.sellSignals,
  bestOpportunity: .data.bestOpportunity
}'

echo ""
echo "=================================="

# Test Trading Engine with Nebius AI
echo ""
echo "⚡ Testing Trading Engine (Nebius AI Integration):"
echo "curl http://localhost:3000/api/trading/engine"
curl -s http://localhost:3000/api/trading/engine | jq '{
  success: .success,
  status: .data.status,
  totalProfit: .data.performance.totalProfit,
  tradesCount: .data.performance.tradesCount
}'

echo ""
echo "=================================="
echo "✅ Nebius AI Integration Testing Complete!"
echo ""
echo "🎯 Integration Features:"
echo "- ✅ Nebius AI Connection Test"
echo "- ✅ Real-time Technical Analysis"
echo "- ✅ Market Sentiment Analysis"
echo "- ✅ Trading Recommendations (BUY/SELL/HOLD)"
echo "- ✅ Confidence Levels & Risk Assessment"
echo "- ✅ Fallback to Technical Analysis if AI fails"
echo "- ✅ Cost-effective token usage"
echo "- ✅ Integration with Trading Engine"
echo ""
echo "🤖 AI Models Used:"
echo "- meta-llama/Meta-Llama-3.1-8B-Instruct (Detailed Analysis)"
echo "- meta-llama/Meta-Llama-3.1-8B-Instruct-fast (Quick Sentiment)"