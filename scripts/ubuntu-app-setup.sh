#!/bin/bash

# Application Setup Script
# This script clones the repository, installs dependencies, and configures the application
# Run as the application user (NOT root): bash ubuntu-app-setup.sh

set -e  # Exit on error

echo "=========================================="
echo "Live Trading Bot - Application Setup"
echo "=========================================="
echo ""

# Check if NOT running as root
if [ "$EUID" -eq 0 ]; then 
    echo "Please run as the application user (NOT root)"
    echo "Example: su - tradingbot -c 'bash ubuntu-app-setup.sh'"
    exit 1
fi

# Configuration
APP_DIR="$HOME/NovemberAITrader"
REPO_URL="https://github.com/yourusername/NovemberAITrader.git"  # Update with your repo URL

# Prompt for repository URL
echo "Step 1: Repository Configuration"
read -p "Enter repository URL (or press Enter to use current directory): " USER_REPO_URL

if [ -n "$USER_REPO_URL" ]; then
    REPO_URL="$USER_REPO_URL"
    
    # Clone repository
    echo ""
    echo "Cloning repository from $REPO_URL..."
    
    if [ -d "$APP_DIR" ]; then
        echo "Directory $APP_DIR already exists."
        read -p "Remove and re-clone? (y/n): " RECLONE
        if [ "$RECLONE" = "y" ] || [ "$RECLONE" = "Y" ]; then
            rm -rf "$APP_DIR"
            git clone "$REPO_URL" "$APP_DIR"
        else
            echo "Using existing directory."
        fi
    else
        git clone "$REPO_URL" "$APP_DIR"
    fi
    
    cd "$APP_DIR"
else
    # Use current directory
    echo "Using current directory as application directory..."
    APP_DIR=$(pwd)
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo "Error: package.json not found. Are you in the correct directory?"
        exit 1
    fi
fi

echo "✓ Application directory: $APP_DIR"
echo ""

# Install npm dependencies
echo "Step 2: Installing npm dependencies..."
cd "$APP_DIR"

# Check if package-lock.json exists
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

echo "✓ Dependencies installed"
echo ""

# Setup environment variables
echo "Step 3: Setting up environment variables..."

if [ -f ".env.production" ]; then
    echo "✓ .env.production already exists"
    read -p "Do you want to reconfigure it? (y/n): " RECONFIG
    if [ "$RECONFIG" != "y" ] && [ "$RECONFIG" != "Y" ]; then
        echo "Keeping existing .env.production"
    else
        SETUP_ENV=true
    fi
else
    SETUP_ENV=true
fi

if [ "$SETUP_ENV" = true ]; then
    # Copy template if it exists
    if [ -f ".env.production.template" ]; then
        cp .env.production.template .env.production
        echo "✓ Created .env.production from template"
    else
        touch .env.production
        echo "✓ Created empty .env.production"
    fi
    
    echo ""
    echo "Please configure the following environment variables:"
    echo ""
    
    # Prompt for essential configuration
    read -p "Enter Nebius API URL (default: https://api.studio.nebius.ai/v1): " NEBIUS_URL
    NEBIUS_URL=${NEBIUS_URL:-https://api.studio.nebius.ai/v1}
    
    read -p "Enter Nebius JWT Token: " NEBIUS_TOKEN
    
    read -p "Enter Binance Futures API Key: " BINANCE_KEY
    
    read -sp "Enter Binance Futures Secret Key: " BINANCE_SECRET
    echo ""
    
    read -p "Enter Database URL (from database setup): " DATABASE_URL
    
    read -p "Enter Application Port (default: 3000): " APP_PORT
    APP_PORT=${APP_PORT:-3000}
    
    # Write to .env.production
    cat > .env.production << EOF
# Nebius AI Configuration
NEBIUS_API_URL=$NEBIUS_URL
NEBIUS_JWT_TOKEN=$NEBIUS_TOKEN
NEBIUS_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct

# Binance Futures Configuration
BINANCE_FUTURES_API_KEY=$BINANCE_KEY
BINANCE_FUTURES_SECRET_KEY=$BINANCE_SECRET
BINANCE_FUTURES_TESTNET=true
BINANCE_FUTURES_BASE_URL=https://testnet.binancefuture.com

# Database Configuration
DATABASE_URL=$DATABASE_URL

# Application Configuration
NODE_ENV=production
PORT=$APP_PORT
LOG_LEVEL=info

# Trading Configuration
TRADING_PAIRS=BTCUSDT,ETHUSDT
MAX_POSITION_SIZE=1000
STOP_LOSS_PERCENTAGE=2
DEFAULT_LEVERAGE=5
MAX_LEVERAGE=10

# Advanced Features (enable as needed)
ENABLE_MULTI_TIMEFRAME=false
ENABLE_SENTIMENT_ANALYSIS=false
ENABLE_WHALE_DETECTION=false

# API Keys for Advanced Features (optional)
# NEWS_API_KEY=
# TWITTER_API_KEY=
# REDDIT_API_KEY=
EOF

    chmod 600 .env.production
    echo "✓ Environment variables configured"
fi

echo ""

# Run Prisma migrations
echo "Step 4: Setting up database schema..."

if [ -f "prisma/schema.prisma" ]; then
    # Generate Prisma client
    npx prisma generate
    
    # Run migrations
    npx prisma migrate deploy
    
    echo "✓ Database schema initialized"
else
    echo "⚠ Warning: prisma/schema.prisma not found. Skipping database setup."
fi

echo ""

# Build the application
echo "Step 5: Building the application..."
npm run build

echo "✓ Application built successfully"
echo ""

# Create systemd service file (optional)
echo "Step 6: Creating systemd service..."

SERVICE_FILE="/tmp/trading-bot.service"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Live Trading Bot AI
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/trading-bot/output.log
StandardError=append:/var/log/trading-bot/error.log

[Install]
WantedBy=multi-user.target
EOF

echo "✓ Systemd service file created at $SERVICE_FILE"
echo ""
echo "To install the service, run as root:"
echo "  sudo mkdir -p /var/log/trading-bot"
echo "  sudo chown $USER:$USER /var/log/trading-bot"
echo "  sudo cp $SERVICE_FILE /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable trading-bot"
echo "  sudo systemctl start trading-bot"
echo ""

# Create start/stop scripts
cat > "$APP_DIR/start-bot.sh" << 'START_SCRIPT'
#!/bin/bash
cd "$(dirname "$0")"
npm start
START_SCRIPT

cat > "$APP_DIR/stop-bot.sh" << 'STOP_SCRIPT'
#!/bin/bash
pkill -f "node.*next"
STOP_SCRIPT

chmod +x "$APP_DIR/start-bot.sh"
chmod +x "$APP_DIR/stop-bot.sh"

echo "✓ Start/stop scripts created"
echo ""

echo "=========================================="
echo "Application Setup Complete!"
echo "=========================================="
echo ""
echo "Application Details:"
echo "  Directory: $APP_DIR"
echo "  Port: $APP_PORT"
echo "  Environment: production"
echo ""
echo "Quick Start Commands:"
echo "  Start manually: cd $APP_DIR && npm start"
echo "  Or use: $APP_DIR/start-bot.sh"
echo "  Stop: $APP_DIR/stop-bot.sh"
echo ""
echo "Systemd Service (recommended):"
echo "  Install: sudo cp $SERVICE_FILE /etc/systemd/system/ && sudo systemctl daemon-reload"
echo "  Start: sudo systemctl start trading-bot"
echo "  Stop: sudo systemctl stop trading-bot"
echo "  Status: sudo systemctl status trading-bot"
echo "  Logs: sudo journalctl -u trading-bot -f"
echo ""
echo "Next steps:"
echo "  1. Review and update .env.production if needed"
echo "  2. Test the application: npm start"
echo "  3. Access dashboard at: http://your-server-ip:$APP_PORT"
echo "  4. Configure Nginx reverse proxy (optional)"
echo ""
