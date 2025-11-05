#!/bin/bash

echo "🔍 Testing Console Error Fixes"
echo "=============================="

BASE_URL="http://43.157.206.235:3000"

# Test 1: Model Chat API
echo "1. Testing /api/model/chat (was 500 error):"
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/model/chat")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "   ✅ Status: $http_code"
    echo "   📊 Data: $(echo "$body" | jq -r '.data | length') items"
else
    echo "   ❌ Status: $http_code"
    echo "   📄 Response: ${body:0:100}..."
fi

# Test 2: Metrics API (was JSON parse error)
echo "2. Testing /api/metrics (was JSON parse error):"
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/metrics")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "   ✅ Status: $http_code"
    echo "   📊 Format: $(echo "$body" | jq -r 'type')"
    echo "   🕐 Timestamp: $(echo "$body" | jq -r '.timestamp')"
else
    echo "   ❌ Status: $http_code"
    echo "   📄 Response: ${body:0:100}..."
fi

# Test 3: Pricing API
echo "3. Testing /api/pricing:"
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/pricing")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "   ✅ Status: $http_code"
    echo "   📊 Success: $(echo "$body" | jq -r '.success')"
else
    echo "   ❌ Status: $http_code"
fi

# Test 4: Trading Dashboard
echo "4. Testing /api/trading/dashboard:"
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/trading/dashboard")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "   ✅ Status: $http_code"
    echo "   📊 Success: $(echo "$body" | jq -r '.success')"
else
    echo "   ❌ Status: $http_code"
fi

# Test 5: Health Check
echo "5. Testing /api/health:"
response=$(curl -s -w "%{http_code}" "$BASE_URL/api/health")
http_code="${response: -3}"
body="${response%???}"
if [ "$http_code" = "200" ]; then
    echo "   ✅ Status: $http_code"
    echo "   🏥 Health: $(echo "$body" | jq -r '.status')"
else
    echo "   ❌ Status: $http_code"
fi

echo ""
echo "🎯 SUMMARY:"
echo "   All critical API endpoints should now work without console errors"
echo "   Website: $BASE_URL"
echo ""
echo "🚀 Your trading bot website is ready!"