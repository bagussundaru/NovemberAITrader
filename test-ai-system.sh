#!/bin/bash

echo "🤖 Testing AI Trading System..."
echo "=================================="

# Test AI Analysis Trigger
echo ""
echo "🚀 Triggering AI Analysis:"
echo "curl -X POST http://localhost:3000/api/ai/analysis"
curl -X POST -s http://localhost:3000/api/ai/analysis | jq '{
  success: .success,
  message: .message,
  totalAnalyzed: .data.totalAnalyzed,
  buySignals: .data.buySignals,
  sellSignals: .data.sellSignals,
  bestOpportunity: .data.bestOpportunity
}'

echo ""
echo "=================================="

# Test Cron Job (3-minute interval)
echo ""
echo "⏰ Testing Cron Job AI Analysis:"
echo "curl http://localhost:3000/api/cron/3-minutes-run-interval"
curl -s http://localhost:3000/api/cron/3-minutes-run-interval | jq '{
  success: .success,
  message: .message
}'

echo ""
echo "=================================="

# Test Health with AI Status
echo ""
echo "❤️ System Health Check:"
echo "curl http://localhost:3000/api/health"
curl -s http://localhost:3000/api/health | jq '{
  status: .status,
  services: .services,
  uptime: .uptime
}'

echo ""
echo "=================================="
echo "✅ AI System Testing Complete!"