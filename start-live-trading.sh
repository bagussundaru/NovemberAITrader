#!/bin/bash

echo "🚀 Starting Live Trading Bot..."
echo "📊 Dashboard: http://localhost:3000"
echo "🔍 Health Check: http://localhost:3000/api/health"
echo ""

# Check if services are running
echo "🔍 Checking services status..."
docker-compose ps

echo ""
echo "🏥 Checking application health..."
curl -s http://localhost:3000/api/health | jq .

echo ""
echo "🧪 Running workflow validation..."
curl -X POST http://localhost:3000/api/trading/validate-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "testDuration": 5000,
    "tradingPairs": ["BTC/USDT"],
    "enableRealTrading": false,
    "mockMode": true
  }' | jq .summary

echo ""
echo "🎯 Starting trading session (mock mode for safety)..."
curl -X POST http://localhost:3000/api/trading/start \
  -H "Content-Type: application/json" \
  -d '{
    "tradingPairs": ["BTC/USDT", "ETH/USDT"],
    "maxConcurrentTrades": 2,
    "enableAutoTrading": true,
    "signalProcessingInterval": 60000,
    "positionUpdateInterval": 30000
  }' | jq .

echo ""
echo "📈 Trading Status:"
curl -s http://localhost:3000/api/trading/status | jq .data.isRunning

echo ""
echo "✅ Trading bot is now LIVE!"
echo ""
echo "📊 Monitor your bot:"
echo "   - Dashboard: http://localhost:3000"
echo "   - Health: http://localhost:3000/api/health"
echo "   - Status: http://localhost:3000/api/trading/status"
echo "   - Grafana: http://localhost:3001 (admin/admin)"
echo ""
echo "🛑 To stop trading:"
echo "   curl -X POST http://localhost:3000/api/trading/stop"
echo ""
echo "🔧 To stop all services:"
echo "   docker-compose down"