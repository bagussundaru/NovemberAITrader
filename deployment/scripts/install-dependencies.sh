#!/bin/bash

###############################################################################
# Trading Bot VM Deployment - Dependencies Installation Script
# Deskripsi: Install semua dependencies yang diperlukan untuk trading bot
# Usage: sudo bash install-dependencies.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Trading Bot Dependencies Installation${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Update system packages
echo -e "\n${YELLOW}[1/8] Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install basic utilities
echo -e "\n${YELLOW}[2/8] Installing basic utilities...${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    htop \
    vim \
    unzip \
    net-tools

# Install Node.js 20.x (LTS)
echo -e "\n${YELLOW}[3/8] Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js already installed: $(node --version)"
fi

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
echo -e "${GREEN}✓ npm: $NPM_VERSION${NC}"

# Install PostgreSQL 15
echo -e "\n${YELLOW}[4/8] Installing PostgreSQL 15...${NC}"
if ! command -v psql &> /dev/null; then
    # Add PostgreSQL repository
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update
    apt-get install -y postgresql-15 postgresql-contrib-15

    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
else
    echo "PostgreSQL already installed: $(psql --version)"
fi

echo -e "${GREEN}✓ PostgreSQL installed${NC}"

# Install Nginx
echo -e "\n${YELLOW}[5/8] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
else
    echo "Nginx already installed: $(nginx -v 2>&1)"
fi

echo -e "${GREEN}✓ Nginx installed${NC}"

# Install PM2 globally
echo -e "\n${YELLOW}[6/8] Installing PM2 process manager...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
else
    echo "PM2 already installed: $(pm2 --version)"
fi

echo -e "${GREEN}✓ PM2 installed${NC}"

# Setup firewall (UFW)
echo -e "\n${YELLOW}[7/8] Configuring firewall (UFW)...${NC}"
if ! command -v ufw &> /dev/null; then
    apt-get install -y ufw
fi

# Configure UFW rules
ufw --force enable
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 3000/tcp comment 'Trading Bot'
ufw allow 5432/tcp comment 'PostgreSQL'

echo -e "${GREEN}✓ Firewall configured${NC}"

# Install fail2ban for security
echo -e "\n${YELLOW}[8/8] Installing fail2ban...${NC}"
if ! command -v fail2ban-client &> /dev/null; then
    apt-get install -y fail2ban
    systemctl start fail2ban
    systemctl enable fail2ban
else
    echo "fail2ban already installed"
fi

# Configure fail2ban for SSH
cat > /etc/fail2ban/jail.local <<EOF
[sshd]
enabled = true
port = 22
maxretry = 5
bantime = 3600
EOF

systemctl restart fail2ban
echo -e "${GREEN}✓ fail2ban installed and configured${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nInstalled versions:"
echo -e "  Node.js: $(node --version)"
echo -e "  npm: $(npm --version)"
echo -e "  PostgreSQL: $(psql --version | head -n1)"
echo -e "  Nginx: $(nginx -v 2>&1)"
echo -e "  PM2: $(pm2 --version)"
echo -e "\nServices status:"
systemctl is-active postgresql && echo -e "  PostgreSQL: ${GREEN}running${NC}" || echo -e "  PostgreSQL: ${RED}stopped${NC}"
systemctl is-active nginx && echo -e "  Nginx: ${GREEN}running${NC}" || echo -e "  Nginx: ${RED}stopped${NC}"
systemctl is-active fail2ban && echo -e "  fail2ban: ${GREEN}running${NC}" || echo -e "  fail2ban: ${RED}stopped${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. Run: sudo bash deployment/scripts/setup-database.sh"
echo -e "  2. Run: sudo bash deployment/scripts/setup-environment.sh"
echo -e "  3. Run: bash deployment/scripts/deploy-app.sh"

echo -e "\n${GREEN}Done!${NC}"
