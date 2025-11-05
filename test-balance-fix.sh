#!/bin/bash

echo "🔍 Testing Balance and Trading Data Fix"
echo "======================================"

BASE_URL="http://43.157.206.235:3000"

# Test 1: Check if data exists in database
echo "1. Checking database data..."
docker exec live-trading-bot node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const positions = await prisma.tradingPosition.count();
    const trades = await prisma.tradeExecution.count();
    const signals = await prisma.tradingSignal.count();
    
    console.log('Database contains:');
    console.log('- Positions:', positions);
    console.log('- Trades:', trades);
    console.log('- Signals:', signals);
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

checkData();
"

echo ""
echo "2. Testing dashboard endpoint..."
response=$(curl -s "$BASE_URL/api/trading/dashboard")
echo "Response preview:"
echo "$response" | jq '.data.accountBalance'

echo ""
echo "3. Testing balance endpoint..."
balance_response=$(curl -s "$BASE_URL/api/trading/balance")
echo "Balance response:"
echo "$balance_response" | jq '.data'

echo ""
echo "4. Testing positions..."
positions=$(echo "$response" | jq '.data.positions')
echo "Positions:"
echo "$positions"

echo ""
echo "🎯 Summary:"
total_balance=$(echo "$response" | jq -r '.data.accountBalance.total')
position_count=$(echo "$response" | jq -r '.data.positions.count')

if [ "$total_balance" != "0" ] && [ "$total_balance" != "null" ]; then
    echo "✅ Balance is working: $total_balance USDT"
else
    echo "❌ Balance is still 0"
fi

if [ "$position_count" != "0" ] && [ "$position_count" != "null" ]; then
    echo "✅ Positions are showing: $position_count positions"
else
    echo "❌ No positions showing"
fi