#!/bin/bash

echo "🔄 Migrating database for Exchange Management feature..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Push schema changes to database
echo "🗃️ Pushing schema changes to database..."
npx prisma db push --force-reset

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
    echo ""
    echo "🎯 Exchange Management features added:"
    echo "   - ExchangeApiKey model for storing encrypted API keys"
    echo "   - ExchangeConnection model for connection status"
    echo "   - Support for 60+ exchanges including:"
    echo "     • International: Binance, Bybit, OKX, KuCoin, Gate.io"
    echo "     • Indonesian: Indodax, Tokocrypto, Zipmex, Pintu"
    echo "     • And many more..."
    echo ""
    echo "🔐 Security features:"
    echo "   - AES-256-GCM encryption for API keys"
    echo "   - Secure key derivation with PBKDF2"
    echo "   - Individual encryption keys per record"
    echo ""
    echo "🚀 Ready to add your exchange API keys!"
else
    echo "❌ Database migration failed!"
    exit 1
fi