#!/bin/bash

echo "🚀 Testing Trading Engine System..."
echo "=================================="

# Test Trading Engine Status
echo ""
echo "📊 Getting Trading Engine Status:"
echo "curl http://localhost:3000/api/trading/engine"
curl -s http://localhost:3000/api/trading/engine | jq '{
  success: .success,
  status: .data.status,
  performance: .data.performance,
  config: .data.config
}'

echo ""
echo "=================================="

# Start Trading Engine
echo ""
echo "🚀 Starting Trading Engine:"
echo "curl -X POST http://localhost:3000/api/trading/engine -d '{\"action\":\"start\"}'"
curl -X POST -s http://localhost:3000/api/trading/engine \
  -H "Content-Type: application/json" \
  -d '{"action":"start"}' | jq '{
  success: .success,
  message: .message,
  status: .data.status
}'

echo ""
echo "=================================="

# Wait and check status again
echo ""
echo "⏳ Waiting 10 seconds then checking status..."
sleep 10

echo "curl http://localhost:3000/api/trading/engine"
curl -s http://localhost:3000/api/trading/engine | jq '{
  success: .success,
  status: .data.status,
  isRunning: .data.state.isRunning,
  totalProfit: .data.performance.totalProfit,
  tradesCount: .data.performance.tradesCount,
  activePositions: .data.performance.activePositions
}'

echo ""
echo "=================================="

# Test Health Check
echo ""
echo "❤️ Health Check (Trading Engine Status):"
echo "curl http://localhost:3000/api/health"
curl -s http://localhost:3000/api/health | jq '{
  status: .status,
  trading: .services.trading
}'

echo ""
echo "=================================="

# Test AI Analysis Integration
echo ""
echo "🤖 Trigger AI Analysis for Trading:"
echo "curl -X POST http://localhost:3000/api/ai/analysis"
curl -X POST -s http://localhost:3000/api/ai/analysis | jq '{
  success: .success,
  totalAnalyzed: .data.totalAnalyzed,
  sellSignals: .data.sellSignals,
  bestOpportunity: .data.bestOpportunity
}'

echo ""
echo "=================================="
echo "✅ Trading Engine Testing Complete!"
echo ""
echo "🎯 Trading Engine Features:"
echo "- ✅ Real-time AI Analysis Integration"
echo "- ✅ $10 Profit Target System"
echo "- ✅ Automatic Position Management"
echo "- ✅ Risk Management (2% per trade)"
echo "- ✅ Stop Loss (-$5) & Take Profit (+$10)"
echo "- ✅ Multi-symbol Trading (BTC, ETH, SOL, ADA, DOGE)"