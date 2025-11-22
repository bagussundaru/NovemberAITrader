#!/bin/bash

###############################################################################
# Trading Bot VM Deployment - Environment Setup Script
# Deskripsi: Setup environment variables dan konfigurasi
# Usage: sudo bash setup-environment.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Trading Bot Environment Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Get project directory
PROJECT_DIR="/root/NovemberAITrader"
ENV_FILE="$PROJECT_DIR/.env.production"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# Load database credentials
CREDENTIALS_FILE="/root/.trading-bot-credentials"
if [ -f "$CREDENTIALS_FILE" ]; then
    source "$CREDENTIALS_FILE"
    echo -e "${GREEN}✓ Database credentials loaded${NC}"
else
    echo -e "${YELLOW}Warning: Database credentials not found. Please run setup-database.sh first.${NC}"
fi

# Create .env.production file
echo -e "\n${YELLOW}Creating .env.production file...${NC}"

cat > "$ENV_FILE" <<EOF
# Trading Bot Production Environment Configuration
# Generated on: $(date)

# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_URL=http://localhost:3000

# Database
DATABASE_URL=${DATABASE_URL:-postgresql://trading_user:password@localhost:5432/trading_bot}

# Binance Configuration (Testnet by default)
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_secret_key_here
BINANCE_USE_SANDBOX=true

# Gate.io Testnet Configuration
GATE_API_URL=https://fx-api-testnet.gateio.ws
GATE_API_KEY=your_gate_api_key_here
GATE_API_SECRET=your_gate_secret_key_here
GATE_TESTNET=true

# Nebius AI Configuration
NEBIUS_API_URL=https://api.studio.nebius.ai/v1
NEBIUS_JWT_TOKEN=your_nebius_jwt_token_here
NEBIUS_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
NEBIUS_MAX_RETRIES=3
NEBIUS_TIMEOUT=30000

# DeepSeek AI Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# OpenRouter AI Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# EXA Search Configuration
EXA_API_KEY=your_exa_api_key_here

# Trading Bot Risk Management
MAX_DAILY_LOSS=100
MAX_POSITION_SIZE=1000
STOP_LOSS_PERCENTAGE=5
MAX_OPEN_POSITIONS=5
EMERGENCY_STOP_ENABLED=true

# Trading Configuration
TRADING_PAIRS=BTC/USDT,ETH/USDT,SOL/USDT
MARKET_DATA_UPDATE_INTERVAL=1000
START_MONEY=30

# Futures Trading Configuration
MAX_LEVERAGE=10
DEFAULT_LEVERAGE=5

# Cron Secret
CRON_SECRET_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
EOF

chmod 600 "$ENV_FILE"
echo -e "${GREEN}✓ Environment file created: $ENV_FILE${NC}"

# Create logging directories
echo -e "\n${YELLOW}Setting up logging directories...${NC}"
mkdir -p /var/log/trading-bot/metrics
chmod 755 /var/log/trading-bot
chmod 755 /var/log/trading-bot/metrics

echo -e "${GREEN}✓ Logging directories created${NC}"

# Setup logrotate for trading bot logs
echo -e "\n${YELLOW}Configuring log rotation...${NC}"

cat > /etc/logrotate.d/trading-bot <<EOF
/var/log/trading-bot/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    sharedscripts
    postrotate
        systemctl reload trading-bot > /dev/null 2>&1 || true
    endscript
}

/var/log/trading-bot/metrics/*.json {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF

echo -e "${GREEN}✓ Log rotation configured${NC}"

# Create monitoring directories
echo -e "\n${YELLOW}Setting up monitoring...${NC}"
mkdir -p /var/lib/trading-bot/monitoring
chmod 755 /var/lib/trading-bot/monitoring

echo -e "${GREEN}✓ Monitoring directories created${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Environment Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nConfiguration files created:"
echo -e "  Environment: $ENV_FILE"
echo -e "  Log directory: /var/log/trading-bot"
echo -e "  Monitoring directory: /var/lib/trading-bot/monitoring"

echo -e "\n${YELLOW}⚠️  IMPORTANT: Edit $ENV_FILE and add your API keys:${NC}"
echo -e "  - BINANCE_API_KEY"
echo -e "  - BINANCE_API_SECRET"
echo -e "  - NEBIUS_JWT_TOKEN"
echo -e "  - GATE_API_KEY (optional)"
echo -e "  - GATE_API_SECRET (optional)"
echo -e "  - DEEPSEEK_API_KEY (optional)"
echo -e "  - OPENROUTER_API_KEY (optional)"
echo -e "  - EXA_API_KEY (optional)"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. Edit API keys: nano $ENV_FILE"
echo -e "  2. Run deployment: bash deployment/scripts/deploy-app.sh"

echo -e "\n${GREEN}Done!${NC}"
