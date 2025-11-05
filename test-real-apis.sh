#!/bin/bash

echo "🚀 Testing Real API Endpoints..."
echo "=================================="

# Test pricing endpoint
echo ""
echo "📊 Testing Pricing API (Real Binance Data):"
echo "curl http://localhost:3000/api/pricing"
curl -s http://localhost:3000/api/pricing | jq '.'

echo ""
echo "=================================="

# Test balance endpoint  
echo ""
echo "💰 Testing Balance API (Real Binance Data):"
echo "curl http://localhost:3000/api/trading/balance"
curl -s http://localhost:3000/api/trading/balance | jq '.'

echo ""
echo "=================================="

# Test health endpoint
echo ""
echo "❤️ Testing Health API:"
echo "curl http://localhost:3000/api/health"
curl -s http://localhost:3000/api/health | jq '.services'

echo ""
echo "=================================="
echo "✅ API Testing Complete!"