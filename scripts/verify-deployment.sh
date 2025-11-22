#!/bin/bash

# Deployment Verification Script
# This script checks if all components are properly installed and configured
# Run with: bash scripts/verify-deployment.sh

echo "=========================================="
echo "Live Trading Bot - Deployment Verification"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Function to check command exists
check_command() {
    if command -v "$1" &> /dev/null; then
        echo "✓ $1 is installed"
        return 0
    else
        echo "✗ $1 is NOT installed"
        ((ERRORS++))
        return 1
    fi
}

# Function to check service status
check_service() {
    if systemctl is-active --quiet "$1"; then
        echo "✓ $1 service is running"
        return 0
    else
        echo "✗ $1 service is NOT running"
        ((ERRORS++))
        return 1
    fi
}

# Function to check port
check_port() {
    if netstat -tuln 2>/dev/null | grep -q ":$1 " || ss -tuln 2>/dev/null | grep -q ":$1 "; then
        echo "✓ Port $1 is listening"
        return 0
    else
        echo "⚠ Port $1 is NOT listening"
        ((WARNINGS++))
        return 1
    fi
}

# Check system dependencies
echo "Checking System Dependencies..."
echo "----------------------------"
check_command node
check_command npm
check_command psql
check_command docker
check_command nginx
echo ""

# Check versions
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  Node.js version: $NODE_VERSION"
    
    # Check if version is 18 or higher
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo "  ✓ Node.js version is 18 or higher"
    else
        echo "  ✗ Node.js version should be 18 or higher"
        ((ERRORS++))
    fi
fi
echo ""

# Check services
echo "Checking Services..."
echo "----------------------------"
check_service postgresql
check_service nginx
check_service docker
echo ""

# Check firewall
echo "Checking Firewall..."
echo "----------------------------"
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        echo "✓ UFW firewall is active"
        echo ""
        echo "Firewall rules:"
        ufw status numbered | grep -E "(22|80|443|3000)"
    else
        echo "⚠ UFW firewall is NOT active"
        ((WARNINGS++))
    fi
else
    echo "⚠ UFW is not installed"
    ((WARNINGS++))
fi
echo ""

# Check fail2ban
echo "Checking fail2ban..."
echo "----------------------------"
if command -v fail2ban-client &> /dev/null; then
    if systemctl is-active --quiet fail2ban; then
        echo "✓ fail2ban is running"
        fail2ban-client status | head -5
    else
        echo "⚠ fail2ban is installed but not running"
        ((WARNINGS++))
    fi
else
    echo "⚠ fail2ban is not installed"
    ((WARNINGS++))
fi
echo ""

# Check database
echo "Checking Database..."
echo "----------------------------"
if command -v psql &> /dev/null; then
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw trading_bot; then
        echo "✓ Database 'trading_bot' exists"
    else
        echo "✗ Database 'trading_bot' does NOT exist"
        ((ERRORS++))
    fi
    
    if sudo -u postgres psql -c "\du" | grep -q trading_user; then
        echo "✓ Database user 'trading_user' exists"
    else
        echo "✗ Database user 'trading_user' does NOT exist"
        ((ERRORS++))
    fi
fi
echo ""

# Check backup configuration
echo "Checking Backup Configuration..."
echo "----------------------------"
if [ -f "/usr/local/bin/backup-trading-db.sh" ]; then
    echo "✓ Backup script exists"
else
    echo "⚠ Backup script not found"
    ((WARNINGS++))
fi

if [ -d "/var/backups/trading_bot" ]; then
    echo "✓ Backup directory exists"
    BACKUP_COUNT=$(ls -1 /var/backups/trading_bot/*.sql.gz 2>/dev/null | wc -l)
    echo "  Backup files: $BACKUP_COUNT"
else
    echo "⚠ Backup directory not found"
    ((WARNINGS++))
fi

if [ -f "/etc/cron.d/trading-bot-backup" ]; then
    echo "✓ Backup cron job configured"
else
    echo "⚠ Backup cron job not configured"
    ((WARNINGS++))
fi
echo ""

# Check application files
echo "Checking Application..."
echo "----------------------------"
if [ -f "package.json" ]; then
    echo "✓ package.json found"
    
    if [ -d "node_modules" ]; then
        echo "✓ node_modules directory exists"
    else
        echo "⚠ node_modules directory not found (run npm install)"
        ((WARNINGS++))
    fi
    
    if [ -f ".env.production" ]; then
        echo "✓ .env.production exists"
    else
        echo "⚠ .env.production not found"
        ((WARNINGS++))
    fi
    
    if [ -d ".next" ]; then
        echo "✓ Application is built (.next directory exists)"
    else
        echo "⚠ Application not built (run npm run build)"
        ((WARNINGS++))
    fi
else
    echo "⚠ Not in application directory"
    ((WARNINGS++))
fi
echo ""

# Check ports
echo "Checking Network Ports..."
echo "----------------------------"
check_port 22   # SSH
check_port 80   # HTTP
check_port 3000 # Application
check_port 5432 # PostgreSQL
echo ""

# Check systemd service
echo "Checking Systemd Service..."
echo "----------------------------"
if [ -f "/etc/systemd/system/trading-bot.service" ]; then
    echo "✓ Systemd service file exists"
    
    if systemctl is-enabled --quiet trading-bot 2>/dev/null; then
        echo "✓ Service is enabled"
    else
        echo "⚠ Service is not enabled"
        ((WARNINGS++))
    fi
    
    if systemctl is-active --quiet trading-bot 2>/dev/null; then
        echo "✓ Service is running"
    else
        echo "⚠ Service is not running"
        ((WARNINGS++))
    fi
else
    echo "⚠ Systemd service not installed"
    ((WARNINGS++))
fi
echo ""

# Check disk space
echo "Checking Disk Space..."
echo "----------------------------"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo "✓ Disk usage: ${DISK_USAGE}%"
else
    echo "⚠ Disk usage high: ${DISK_USAGE}%"
    ((WARNINGS++))
fi
echo ""

# Check memory
echo "Checking Memory..."
echo "----------------------------"
if command -v free &> /dev/null; then
    TOTAL_MEM=$(free -m | awk 'NR==2 {print $2}')
    USED_MEM=$(free -m | awk 'NR==2 {print $3}')
    MEM_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))
    
    echo "  Total: ${TOTAL_MEM}MB"
    echo "  Used: ${USED_MEM}MB (${MEM_PERCENT}%)"
    
    if [ "$TOTAL_MEM" -ge 4000 ]; then
        echo "✓ Sufficient memory (4GB+)"
    else
        echo "⚠ Low memory (less than 4GB)"
        ((WARNINGS++))
    fi
fi
echo ""

# Summary
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✓ All checks passed! Deployment is complete."
    echo ""
    echo "Next steps:"
    echo "  1. Start the application: sudo systemctl start trading-bot"
    echo "  2. Check status: sudo systemctl status trading-bot"
    echo "  3. View logs: sudo journalctl -u trading-bot -f"
    echo "  4. Access dashboard: http://your-server-ip:3000"
elif [ $ERRORS -eq 0 ]; then
    echo "⚠ Deployment complete with $WARNINGS warning(s)"
    echo ""
    echo "Review the warnings above and address them if needed."
else
    echo "✗ Deployment incomplete: $ERRORS error(s), $WARNINGS warning(s)"
    echo ""
    echo "Please address the errors above before proceeding."
    exit 1
fi

echo ""
