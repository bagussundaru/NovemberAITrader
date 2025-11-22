#!/bin/bash

# Ubuntu VM Setup Script for Live Trading Bot
# This script installs all system dependencies required for the trading bot
# Run with: sudo bash ubuntu-vm-setup.sh

set -e  # Exit on error

echo "=========================================="
echo "Live Trading Bot - Ubuntu VM Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Update system packages
echo "Step 1: Updating system packages..."
apt-get update
apt-get upgrade -y

# Install basic utilities
echo "Step 2: Installing basic utilities..."
apt-get install -y curl wget git build-essential software-properties-common

# Install Node.js 18+ using NodeSource repository
echo "Step 3: Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "Node.js installed: $NODE_VERSION"
echo "npm installed: $NPM_VERSION"

# Install PostgreSQL 14+
echo "Step 4: Installing PostgreSQL 14..."
apt-get install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Verify PostgreSQL installation
PG_VERSION=$(psql --version)
echo "PostgreSQL installed: $PG_VERSION"

# Install Docker
echo "Step 5: Installing Docker..."
apt-get install -y ca-certificates gnupg lsb-release

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify Docker installation
DOCKER_VERSION=$(docker --version)
DOCKER_COMPOSE_VERSION=$(docker compose version)
echo "Docker installed: $DOCKER_VERSION"
echo "Docker Compose installed: $DOCKER_COMPOSE_VERSION"

# Install Nginx
echo "Step 6: Installing Nginx..."
apt-get install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Verify Nginx installation
NGINX_VERSION=$(nginx -v 2>&1)
echo "Nginx installed: $NGINX_VERSION"

echo ""
echo "=========================================="
echo "System Dependencies Installation Complete!"
echo "=========================================="
echo ""
echo "Installed components:"
echo "  - Node.js: $NODE_VERSION"
echo "  - npm: $NPM_VERSION"
echo "  - PostgreSQL: $PG_VERSION"
echo "  - Docker: $DOCKER_VERSION"
echo "  - Docker Compose: $DOCKER_COMPOSE_VERSION"
echo "  - Nginx: $NGINX_VERSION"
echo ""
echo "Next steps:"
echo "  1. Run security configuration script: sudo bash scripts/ubuntu-security-setup.sh"
echo "  2. Run database setup script: sudo bash scripts/ubuntu-database-setup.sh"
echo "  3. Run application setup script: bash scripts/ubuntu-app-setup.sh"
echo ""
