#!/bin/bash

# Master Deployment Script
# This script orchestrates the complete deployment process
# Run with: sudo bash scripts/deploy-all.sh

set -e  # Exit on error

echo "=========================================="
echo "Live Trading Bot - Complete Deployment"
echo "=========================================="
echo ""
echo "This script will perform the following steps:"
echo "  1. Install system dependencies"
echo "  2. Configure security"
echo "  3. Setup PostgreSQL database"
echo "  4. Setup application (as non-root user)"
echo ""
read -p "Continue with deployment? (y/n): " CONTINUE

if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo ""
echo "Project directory: $PROJECT_ROOT"
echo ""

# Step 1: Install system dependencies
echo "=========================================="
echo "Step 1/4: Installing System Dependencies"
echo "=========================================="
echo ""
bash "$SCRIPT_DIR/ubuntu-vm-setup.sh"

echo ""
read -p "Press Enter to continue to security configuration..."
echo ""

# Step 2: Configure security
echo "=========================================="
echo "Step 2/4: Configuring Security"
echo "=========================================="
echo ""
bash "$SCRIPT_DIR/ubuntu-security-setup.sh"

# Get the application user that was created
APP_USER=$(grep "^[^#]" /etc/passwd | grep "/home/" | tail -1 | cut -d: -f1)
if [ -z "$APP_USER" ]; then
    APP_USER="tradingbot"
fi

echo ""
read -p "Press Enter to continue to database setup..."
echo ""

# Step 3: Setup database
echo "=========================================="
echo "Step 3/4: Setting Up Database"
echo "=========================================="
echo ""
bash "$SCRIPT_DIR/ubuntu-database-setup.sh"

echo ""
echo "=========================================="
echo "Step 4/4: Application Setup"
echo "=========================================="
echo ""
echo "The application setup must be run as the application user."
echo "Application user: $APP_USER"
echo ""
echo "Please run the following command manually:"
echo ""
echo "  su - $APP_USER -c 'cd $PROJECT_ROOT && bash scripts/ubuntu-app-setup.sh'"
echo ""
echo "Or login as $APP_USER and run:"
echo "  cd $PROJECT_ROOT"
echo "  bash scripts/ubuntu-app-setup.sh"
echo ""

# Save deployment summary
SUMMARY_FILE="/root/trading-bot-deployment-summary.txt"
cat > "$SUMMARY_FILE" << EOF
========================================
Live Trading Bot - Deployment Summary
========================================
Deployment Date: $(date)
Project Directory: $PROJECT_ROOT
Application User: $APP_USER

Completed Steps:
  ✓ System dependencies installed
  ✓ Security configured
  ✓ Database setup complete

Remaining Steps:
  - Run application setup as $APP_USER
  - Configure environment variables
  - Start the application

Database Credentials:
  See: /root/.trading_bot_db_credentials

Next Steps:
  1. Switch to application user:
     su - $APP_USER

  2. Run application setup:
     cd $PROJECT_ROOT
     bash scripts/ubuntu-app-setup.sh

  3. Start the application:
     sudo systemctl start trading-bot

  4. Access dashboard:
     http://your-server-ip:3000

Documentation:
  Full deployment guide: $PROJECT_ROOT/docs/UBUNTU_VM_DEPLOYMENT.md

Support:
  - View logs: sudo journalctl -u trading-bot -f
  - Check status: sudo systemctl status trading-bot
  - Database backup: sudo /usr/local/bin/backup-trading-db.sh
EOF

echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
cat "$SUMMARY_FILE"
echo ""
echo "Summary saved to: $SUMMARY_FILE"
echo ""
