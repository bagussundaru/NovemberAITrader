#!/bin/bash

# Quick Deployment Script for Live Trading Bot
# Run as root: sudo bash quick-deploy.sh

set -e

echo "=========================================="
echo "🚀 Live Trading Bot - Quick Deployment"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root: sudo bash quick-deploy.sh"
    exit 1
fi

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Project directory: $SCRIPT_DIR"
echo ""

# Step 1: Install Node.js
echo "=========================================="
echo "📦 Step 1/5: Installing Node.js 18..."
echo "=========================================="
if command -v node &> /dev/null; then
    echo "✅ Node.js already installed: $(node --version)"
else
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
fi
echo ""

# Step 2: Install PostgreSQL
echo "=========================================="
echo "🗄️  Step 2/5: Installing PostgreSQL..."
echo "=========================================="
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL already installed: $(psql --version)"
else
    echo "Installing PostgreSQL..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo "✅ PostgreSQL installed: $(psql --version)"
fi
echo ""

# Step 3: Create Database
echo "=========================================="
echo "🔧 Step 3/5: Setting up Database..."
echo "=========================================="

# Generate random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create database and user
sudo -u postgres psql << EOF
-- Drop existing database and user if they exist
DROP DATABASE IF EXISTS trading_bot;
DROP USER IF EXISTS trading_user;

-- Create new database and user
CREATE DATABASE trading_bot;
CREATE USER trading_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE trading_bot TO trading_user;

-- Grant schema permissions
\c trading_bot
GRANT ALL ON SCHEMA public TO trading_user;
EOF

echo "✅ Database created: trading_bot"
echo "✅ User created: trading_user"
echo "✅ Password: $DB_PASSWORD"
echo ""

# Save credentials
CRED_FILE="/root/.trading_bot_credentials"
cat > "$CRED_FILE" << EOF
Database Credentials
====================
Database: trading_bot
User: trading_user
Password: $DB_PASSWORD
Connection String: postgresql://trading_user:$DB_PASSWORD@localhost:5432/trading_bot

Created: $(date)
EOF

chmod 600 "$CRED_FILE"
echo "💾 Credentials saved to: $CRED_FILE"
echo ""

# Step 4: Configure Environment
echo "=========================================="
echo "⚙️  Step 4/5: Configuring Environment..."
echo "=========================================="

if [ ! -f ".env.production" ]; then
    cp .env.production.template .env.production
    echo "✅ Created .env.production from template"
else
    echo "✅ .env.production already exists"
fi

# Update DATABASE_URL in .env.production
sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://trading_user:$DB_PASSWORD@localhost:5432/trading_bot|g" .env.production

echo "✅ Database URL configured"
echo ""
echo "⚠️  IMPORTANT: Edit .env.production and add your API credentials:"
echo "   - NEBIUS_JWT_TOKEN"
echo "   - BINANCE_API_KEY"
echo "   - BINANCE_API_SECRET"
echo ""

# Step 5: Install Dependencies and Build
echo "=========================================="
echo "📦 Step 5/5: Installing Dependencies..."
echo "=========================================="

# Get the original user (who ran sudo)
ORIGINAL_USER="${SUDO_USER:-$USER}"
ORIGINAL_HOME=$(eval echo ~$ORIGINAL_USER)

echo "Installing npm packages as $ORIGINAL_USER..."

# Run npm install as the original user
sudo -u $ORIGINAL_USER bash << 'USEREOF'
cd "$SCRIPT_DIR"
npm install
echo "✅ Dependencies installed"

# Generate Prisma client
npx prisma generate
echo "✅ Prisma client generated"
USEREOF

echo ""
echo "=========================================="
echo "✅ Quick Deployment Complete!"
echo "=========================================="
echo ""
echo "📋 Summary:"
echo "  ✅ Node.js installed"
echo "  ✅ PostgreSQL installed"
echo "  ✅ Database created"
echo "  ✅ Dependencies installed"
echo "  ✅ Prisma client generated"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Edit environment file with your API credentials:"
echo "   nano .env.production"
echo ""
echo "2. Add your credentials:"
echo "   NEBIUS_JWT_TOKEN=your_token_here"
echo "   BINANCE_API_KEY=your_key_here"
echo "   BINANCE_API_SECRET=your_secret_here"
echo ""
echo "3. Run database migrations:"
echo "   npx prisma db push"
echo ""
echo "4. Build the application:"
echo "   npm run build"
echo ""
echo "5. Start the application:"
echo "   npm start"
echo "   # Or use PM2: pm2 start npm --name trading-bot -- start"
echo ""
echo "6. Access dashboard:"
echo "   http://localhost:3000"
echo ""
echo "📄 Database credentials saved to: $CRED_FILE"
echo ""
echo "🎉 Happy Trading!"
echo ""

