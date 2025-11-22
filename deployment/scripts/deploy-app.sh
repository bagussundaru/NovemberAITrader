#!/bin/bash

###############################################################################
# Trading Bot VM Deployment - Application Deployment Script
# Deskripsi: Deploy dan start trading bot application
# Usage: bash deploy-app.sh (as root or regular user)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Trading Bot Application Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Configuration
PROJECT_DIR="/root/NovemberAITrader"
ENV_FILE="$PROJECT_DIR/.env.production"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Project directory not found: $PROJECT_DIR${NC}"
    echo -e "${YELLOW}Please clone the repository first:${NC}"
    echo -e "  git clone https://github.com/bagussundaru/NovemberAITrader.git /root/NovemberAITrader"
    exit 1
fi

cd "$PROJECT_DIR"

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file not found: $ENV_FILE${NC}"
    echo -e "${YELLOW}Please run: sudo bash deployment/scripts/setup-environment.sh${NC}"
    exit 1
fi

# Install Node.js dependencies
echo -e "\n${YELLOW}[1/7] Installing Node.js dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Setup Prisma
echo -e "\n${YELLOW}[2/7] Setting up Prisma...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Push database schema
echo -e "\n${YELLOW}[3/7] Pushing database schema...${NC}"
npx prisma db push --accept-data-loss
echo -e "${GREEN}✓ Database schema updated${NC}"

# Build Next.js application
echo -e "\n${YELLOW}[4/7] Building Next.js application...${NC}"
npm run build
echo -e "${GREEN}✓ Application built successfully${NC}"

# Install systemd service files
if [[ $EUID -eq 0 ]]; then
    echo -e "\n${YELLOW}[5/7] Installing systemd service files...${NC}"

    # Copy service files
    cp deployment/systemd/trading-bot.service /etc/systemd/system/
    cp deployment/systemd/trading-bot-monitor.service /etc/systemd/system/
    cp deployment/systemd/trading-bot-metrics.service /etc/systemd/system/
    cp deployment/systemd/trading-bot-metrics.timer /etc/systemd/system/

    # Make scripts executable
    chmod +x deployment/scripts/*.sh

    # Reload systemd
    systemctl daemon-reload

    echo -e "${GREEN}✓ Systemd services installed${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping systemd installation (not running as root)${NC}"
fi

# Start the application
echo -e "\n${YELLOW}[6/7] Starting trading bot...${NC}"

if [[ $EUID -eq 0 ]]; then
    # Stop existing service if running
    systemctl stop trading-bot 2>/dev/null || true

    # Start and enable service
    systemctl start trading-bot
    systemctl enable trading-bot

    # Start monitoring
    systemctl start trading-bot-monitor
    systemctl enable trading-bot-monitor

    # Start and enable metrics timer
    systemctl start trading-bot-metrics.timer
    systemctl enable trading-bot-metrics.timer

    echo -e "${GREEN}✓ Services started and enabled${NC}"

    # Wait for application to start
    echo -e "\n${YELLOW}Waiting for application to start...${NC}"
    sleep 10

    # Check service status
    if systemctl is-active --quiet trading-bot; then
        echo -e "${GREEN}✓ Trading bot is running${NC}"
    else
        echo -e "${RED}✗ Trading bot failed to start${NC}"
        echo -e "${YELLOW}Check logs: journalctl -u trading-bot -f${NC}"
        exit 1
    fi
else
    # Start with npm (for non-root users)
    echo -e "${YELLOW}Starting application with npm...${NC}"
    npm start &
    echo -e "${GREEN}✓ Application started${NC}"
fi

# Health check
echo -e "\n${YELLOW}[7/7] Running health check...${NC}"
sleep 5

HEALTH_CHECK=$(curl -s http://localhost:3000/api/health || echo "failed")
if [[ "$HEALTH_CHECK" == *"ok"* ]] || [[ "$HEALTH_CHECK" == *"healthy"* ]]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check returned: $HEALTH_CHECK${NC}"
fi

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${BLUE}Application Information:${NC}"
echo -e "  URL: http://localhost:3000"
echo -e "  Environment: production"
echo -e "  Project directory: $PROJECT_DIR"

if [[ $EUID -eq 0 ]]; then
    echo -e "\n${BLUE}Systemd Services:${NC}"
    echo -e "  Main service: trading-bot.service"
    echo -e "  Monitor: trading-bot-monitor.service"
    echo -e "  Metrics: trading-bot-metrics.timer"

    echo -e "\n${BLUE}Useful Commands:${NC}"
    echo -e "  Check status: systemctl status trading-bot"
    echo -e "  View logs: journalctl -u trading-bot -f"
    echo -e "  Restart: systemctl restart trading-bot"
    echo -e "  Stop: systemctl stop trading-bot"
    echo -e "  Monitor health: journalctl -u trading-bot-monitor -f"
fi

echo -e "\n${BLUE}Log Files:${NC}"
echo -e "  Application: /var/log/trading-bot/output.log"
echo -e "  Errors: /var/log/trading-bot/error.log"
echo -e "  Monitor: /var/log/trading-bot/health-monitor.log"
echo -e "  Metrics: /var/log/trading-bot/metrics/"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Access dashboard: http://your-server-ip:3000"
echo -e "  2. Configure Nginx reverse proxy (optional)"
echo -e "  3. Setup SSL certificate (recommended)"
echo -e "  4. Monitor logs and performance"

if [[ $EUID -eq 0 ]]; then
    echo -e "\n${BLUE}Quick Status Check:${NC}"
    systemctl status trading-bot --no-pager -l | head -15
fi

echo -e "\n${GREEN}🚀 Trading Bot is now running!${NC}"
