#!/bin/bash

###############################################################################
# Trading Bot VM Deployment - Nginx Setup Script
# Deskripsi: Configure Nginx as reverse proxy untuk trading bot
# Usage: sudo bash setup-nginx.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Trading Bot Nginx Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Configuration
PROJECT_DIR="/root/NovemberAITrader"
NGINX_CONFIG="/etc/nginx/sites-available/trading-bot.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/trading-bot.conf"

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}Error: Nginx is not installed${NC}"
    echo -e "${YELLOW}Please run: sudo bash deployment/scripts/install-dependencies.sh${NC}"
    exit 1
fi

# Copy Nginx configuration
echo -e "\n${YELLOW}Installing Nginx configuration...${NC}"
cp "$PROJECT_DIR/deployment/nginx/trading-bot.conf" "$NGINX_CONFIG"

# Remove default site if exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo -e "${YELLOW}Removing default Nginx site...${NC}"
    rm -f /etc/nginx/sites-enabled/default
fi

# Create symlink to enable site
if [ ! -L "$NGINX_ENABLED" ]; then
    ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
    echo -e "${GREEN}✓ Nginx site enabled${NC}"
else
    echo -e "${YELLOW}Nginx site already enabled${NC}"
fi

# Test Nginx configuration
echo -e "\n${YELLOW}Testing Nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"

    # Reload Nginx
    echo -e "\n${YELLOW}Reloading Nginx...${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${RED}✗ Nginx configuration is invalid${NC}"
    exit 1
fi

# Enable Nginx to start on boot
systemctl enable nginx

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Nginx Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\nNginx configuration:"
echo -e "  Config file: $NGINX_CONFIG"
echo -e "  Enabled: $NGINX_ENABLED"

echo -e "\n${YELLOW}Important Notes:${NC}"
echo -e "  1. Trading bot is now accessible via Nginx reverse proxy"
echo -e "  2. Default access: http://your-server-ip/"
echo -e "  3. Direct access still available: http://your-server-ip:3000"
echo -e "  4. For HTTPS, setup SSL certificate with Let's Encrypt:"
echo -e "     sudo apt-get install certbot python3-certbot-nginx"
echo -e "     sudo certbot --nginx -d your-domain.com"

echo -e "\nUseful commands:"
echo -e "  Test config: nginx -t"
echo -e "  Reload: systemctl reload nginx"
echo -e "  Status: systemctl status nginx"
echo -e "  Logs: tail -f /var/log/nginx/trading-bot-*.log"

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    echo -e "\n${GREEN}✓ Nginx is running${NC}"
else
    echo -e "\n${RED}✗ Nginx is not running${NC}"
fi

echo -e "\n${GREEN}Done!${NC}"
