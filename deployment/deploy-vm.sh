#!/bin/bash

###############################################################################
# Trading Bot VM - MASTER DEPLOYMENT SCRIPT
# Deskripsi: Deploy trading bot ke VM dengan semua konfigurasi
# Usage: sudo bash deployment/deploy-vm.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║          🚀 AI TRADING BOT - VM DEPLOYMENT SYSTEM 🚀          ║
║                                                               ║
║              Automated Crypto Trading Platform                ║
║                   Full Stack Deployment                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF

echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root${NC}"
   echo -e "${YELLOW}Usage: sudo bash deployment/deploy-vm.sh${NC}"
   exit 1
fi

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}Project Directory: $PROJECT_DIR${NC}"
echo ""

# Confirmation
echo -e "${YELLOW}This script will:${NC}"
echo -e "  1. Install all dependencies (Node.js, PostgreSQL, Nginx, etc.)"
echo -e "  2. Setup and configure PostgreSQL database"
echo -e "  3. Configure firewall and security"
echo -e "  4. Setup environment variables"
echo -e "  5. Setup Nginx reverse proxy"
echo -e "  6. Deploy and start the application"
echo -e "  7. Configure monitoring and logging"
echo ""
echo -e "${YELLOW}This may take 10-15 minutes to complete.${NC}"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Starting deployment...${NC}"
echo ""
sleep 2

# Function to print step
print_step() {
    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}  STEP $1: $2${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Step 1: Install Dependencies
print_step "1/7" "Installing Dependencies"
bash "$SCRIPT_DIR/scripts/install-dependencies.sh"

# Step 2: Setup Database
print_step "2/7" "Setting Up Database"
bash "$SCRIPT_DIR/scripts/setup-database.sh"

# Step 3: Configure Security
print_step "3/7" "Configuring Security & Firewall"
bash "$SCRIPT_DIR/scripts/setup-security.sh"

# Step 4: Setup Environment
print_step "4/7" "Setting Up Environment"
bash "$SCRIPT_DIR/scripts/setup-environment.sh"

# Step 5: Setup Nginx
print_step "5/7" "Setting Up Nginx Reverse Proxy"
bash "$SCRIPT_DIR/scripts/setup-nginx.sh"

# Step 6: Deploy Application
print_step "6/7" "Deploying Application"
bash "$SCRIPT_DIR/scripts/deploy-app.sh"

# Step 7: Final Verification
print_step "7/7" "Running Final Verification"

echo -e "${YELLOW}Waiting for services to stabilize...${NC}"
sleep 10

# Check all services
echo -e "\n${BLUE}Service Status:${NC}"
services=("postgresql" "nginx" "fail2ban" "trading-bot" "trading-bot-monitor")
all_running=true

for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        echo -e "  ✓ $service: ${GREEN}running${NC}"
    else
        echo -e "  ✗ $service: ${RED}stopped${NC}"
        all_running=false
    fi
done

# Health check
echo -e "\n${BLUE}Application Health Check:${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health || echo "failed")
if [[ "$HEALTH_RESPONSE" == *"ok"* ]] || [[ "$HEALTH_RESPONSE" == *"healthy"* ]]; then
    echo -e "  ✓ API Health: ${GREEN}OK${NC}"
else
    echo -e "  ✗ API Health: ${YELLOW}$HEALTH_RESPONSE${NC}"
fi

# Network check
echo -e "\n${BLUE}Network Status:${NC}"
if netstat -tuln | grep -q ":3000 "; then
    echo -e "  ✓ Trading Bot Port (3000): ${GREEN}listening${NC}"
else
    echo -e "  ✗ Trading Bot Port (3000): ${RED}not listening${NC}"
fi

if netstat -tuln | grep -q ":80 "; then
    echo -e "  ✓ Nginx Port (80): ${GREEN}listening${NC}"
else
    echo -e "  ✗ Nginx Port (80): ${RED}not listening${NC}"
fi

# Firewall status
echo -e "\n${BLUE}Firewall Status:${NC}"
ufw status | grep -E "Status:|80|443|3000" | while read line; do
    echo -e "  $line"
done

# Final summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}          🎉 DEPLOYMENT COMPLETE! 🎉${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo -e "${CYAN}📊 Application Information:${NC}"
echo -e "  Project Directory: ${PROJECT_DIR}"
echo -e "  Environment: ${GREEN}production${NC}"
echo -e "  Server IP: ${GREEN}${SERVER_IP}${NC}"
echo ""

echo -e "${CYAN}🌐 Access URLs:${NC}"
echo -e "  Main Dashboard: ${GREEN}http://${SERVER_IP}/${NC}"
echo -e "  Direct Access: ${GREEN}http://${SERVER_IP}:3000/${NC}"
echo -e "  API Health: ${GREEN}http://${SERVER_IP}/api/health${NC}"
echo ""

echo -e "${CYAN}📁 Important Files:${NC}"
echo -e "  Environment: /root/.trading-bot-credentials"
echo -e "  Config: $PROJECT_DIR/.env.production"
echo -e "  Logs: /var/log/trading-bot/"
echo ""

echo -e "${CYAN}🔧 Systemd Services:${NC}"
echo -e "  Main: ${GREEN}trading-bot.service${NC}"
echo -e "  Monitor: ${GREEN}trading-bot-monitor.service${NC}"
echo -e "  Metrics: ${GREEN}trading-bot-metrics.timer${NC}"
echo ""

echo -e "${CYAN}💻 Useful Commands:${NC}"
echo -e "  View status:    ${YELLOW}systemctl status trading-bot${NC}"
echo -e "  View logs:      ${YELLOW}journalctl -u trading-bot -f${NC}"
echo -e "  Restart app:    ${YELLOW}systemctl restart trading-bot${NC}"
echo -e "  Monitor health: ${YELLOW}journalctl -u trading-bot-monitor -f${NC}"
echo -e "  Check metrics:  ${YELLOW}cat /var/log/trading-bot/metrics/metrics-*.json${NC}"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo -e "  1. Edit API credentials: ${CYAN}nano $PROJECT_DIR/.env.production${NC}"
echo -e "     - Add BINANCE_API_KEY and BINANCE_API_SECRET"
echo -e "     - Add NEBIUS_JWT_TOKEN"
echo -e "     - Add other optional API keys"
echo ""
echo -e "  2. After editing credentials, restart the service:"
echo -e "     ${CYAN}systemctl restart trading-bot${NC}"
echo ""
echo -e "  3. For HTTPS/SSL setup:"
echo -e "     ${CYAN}apt-get install certbot python3-certbot-nginx${NC}"
echo -e "     ${CYAN}certbot --nginx -d yourdomain.com${NC}"
echo ""
echo -e "  4. Monitor the application:"
echo -e "     ${CYAN}journalctl -u trading-bot -f${NC}"
echo ""

echo -e "${CYAN}📚 Documentation:${NC}"
echo -e "  Deployment Guide: $PROJECT_DIR/deployment/VM_DEPLOYMENT_GUIDE.md"
echo -e "  README: $PROJECT_DIR/README.md"
echo ""

echo -e "${CYAN}🔐 Security Reminders:${NC}"
echo -e "  ✓ Firewall configured (UFW)"
echo -e "  ✓ fail2ban enabled"
echo -e "  ✓ Automatic security updates enabled"
echo -e "  ✓ SSH hardened"
echo -e "  ⚠  Setup SSH key authentication (recommended)"
echo -e "  ⚠  Setup SSL/TLS certificate (recommended)"
echo ""

if [ "$all_running" = true ]; then
    echo -e "${GREEN}✅ All services are running successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Some services are not running. Please check logs:${NC}"
    echo -e "   ${CYAN}journalctl -xe${NC}"
fi

echo ""
echo -e "${GREEN}Thank you for using AI Trading Bot Deployment System!${NC}"
echo -e "${GREEN}Happy Trading! 🚀📈${NC}"
echo ""
