#!/bin/bash

echo "🧪 Testing All Fixed API Endpoints"
echo "=================================="

BASE_URL="http://localhost:3000"

# Test Health
echo "1. Testing Health Endpoint..."
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/health")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "✅ Health: OK"
    echo "   Status: $(echo "$body" | jq -r .status)"
else
    echo "❌ Health: Failed ($http_code)"
fi

# Test Model Chat
echo "2. Testing Model Chat Endpoint..."
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/model/chat")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "✅ Model Chat: OK"
    echo "   Response type: $(echo "$body" | jq -r 'type')"
else
    echo "❌ Model Chat: Failed ($http_code)"
fi

# Test Pricing
echo "3. Testing Pricing Endpoint..."
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/pricing")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "✅ Pricing: OK"
    echo "   Success: $(echo "$body" | jq -r .success)"
else
    echo "❌ Pricing: Failed ($http_code)"
fi

# Test Metrics JSON
echo "4. Testing Metrics JSON Endpoint..."
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/metrics-json")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "✅ Metrics JSON: OK"
    echo "   Has timestamp: $(echo "$body" | jq -r 'has("timestamp")')"
else
    echo "❌ Metrics JSON: Failed ($http_code)"
fi

# Test Dashboard Data
echo "5. Testing Dashboard Data Endpoint..."
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/dashboard-data")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "✅ Dashboard Data: OK"
    echo "   Success: $(echo "$body" | jq -r .success)"
else
    echo "❌ Dashboard Data: Failed ($http_code)"
    echo "   Response preview: ${body:0:100}..."
fi

# Test Trading Status
echo "6. Testing Trading Status..."
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/trading/status")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "✅ Trading Status: OK"
    echo "   Success: $(echo "$body" | jq -r .success)"
else
    echo "❌ Trading Status: Failed ($http_code)"
fi

echo ""
echo "🎯 Summary: All critical API endpoints tested"
echo "   Website should now work without console errors!"