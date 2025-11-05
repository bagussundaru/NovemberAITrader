#!/bin/bash

echo "🧪 Testing All API Endpoints..."
echo "================================"

# Test Health
echo "1. Testing /api/health"
curl -s http://localhost:3000/api/health | jq .status
echo ""

# Test Pricing
echo "2. Testing /api/pricing"
curl -s http://localhost:3000/api/pricing | jq .success
echo ""

# Test Trading Status
echo "3. Testing /api/trading/status"
curl -s http://localhost:3000/api/trading/status | jq .success
echo ""

# Test Trading Config
echo "4. Testing /api/trading/config"
curl -s http://localhost:3000/api/trading/config | jq .success
echo ""

# Test Model Chat (problematic)
echo "5. Testing /api/model/chat"
response=$(curl -s -w "%{http_code}" http://localhost:3000/api/model/chat)
http_code="${response: -3}"
if [ "$http_code" = "200" ]; then
    echo "✅ Success"
else
    echo "❌ Failed with HTTP $http_code"
fi
echo ""

# Test Metrics JSON (new endpoint)
echo "6. Testing /api/metrics-json"
response=$(curl -s -w "%{http_code}" http://localhost:3000/api/metrics-json)
http_code="${response: -3}"
if [ "$http_code" = "200" ]; then
    echo "✅ Success"
else
    echo "❌ Failed with HTTP $http_code"
fi
echo ""

# Test Main Page
echo "7. Testing main page"
response=$(curl -s -w "%{http_code}" http://localhost:3000/)
http_code="${response: -3}"
if [ "$http_code" = "200" ]; then
    echo "✅ Success"
else
    echo "❌ Failed with HTTP $http_code"
fi
echo ""

echo "🏁 Test completed!"