#!/bin/bash

# Deployment Script for Nebius VM (103.126.116.150)
# Bybit Margin Trading Bot
# Run as: sudo bash scripts/deploy-nebius-vm.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VM_IP="103.126.116.150"
APP_USER="tradingbot"
ENV_FILE=".env.nebius"

echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}Nebius VM Deployment - Bybit Margin Bot${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""
echo -e "${BLUE}Target VM IP:${NC} $VM_IP"
echo -e "${BLUE}Environment:${NC} Production (Bybit Live Trading)"
echo -e "${BLUE}Project Dir:${NC} $PROJECT_DIR"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Please run as root (use sudo)"
    exit 1
fi

# Log function
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${MAGENTA}==>${NC} $1"
    echo ""
}

# Step 1: System Update and Prerequisites
install_system_dependencies() {
    log_step "STEP 1: Installing System Dependencies"

    log_info "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y

    log_info "Installing essential packages..."
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        software-properties-common \
        ufw \
        fail2ban \
        htop \
        jq \
        unzip \
        postgresql \
        postgresql-contrib \
        nginx \
        certbot \
        python3-certbot-nginx

    log_success "System dependencies installed"
}

# Step 2: Install Node.js
install_nodejs() {
    log_step "STEP 2: Installing Node.js 18"

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        log_info "Node.js already installed: $NODE_VERSION"
    else
        log_info "Installing Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
        log_success "Node.js installed: $(node -v)"
    fi

    log_info "NPM version: $(npm -v)"
}

# Step 3: Install Docker (optional, for future use)
install_docker() {
    log_step "STEP 3: Installing Docker (Optional)"

    if command -v docker &> /dev/null; then
        log_info "Docker already installed: $(docker --version)"
    else
        log_info "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh

        log_info "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose

        log_success "Docker installed: $(docker --version)"
        log_success "Docker Compose installed: $(docker-compose --version)"
    fi
}

# Step 4: Configure Firewall
configure_firewall() {
    log_step "STEP 4: Configuring Firewall"

    log_info "Configuring UFW firewall..."

    # Reset UFW to default
    ufw --force reset

    # Default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow 22/tcp comment 'SSH'

    # Allow HTTP/HTTPS (for Nginx)
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'

    # Allow application port
    ufw allow 3000/tcp comment 'Trading Bot'

    # Enable firewall
    ufw --force enable

    log_success "Firewall configured"
    ufw status verbose
}

# Step 5: Configure fail2ban
configure_fail2ban() {
    log_step "STEP 5: Configuring fail2ban"

    log_info "Setting up fail2ban for SSH protection..."

    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
EOF

    systemctl restart fail2ban
    systemctl enable fail2ban

    log_success "fail2ban configured and started"
}

# Step 6: Setup PostgreSQL Database
setup_database() {
    log_step "STEP 6: Setting Up PostgreSQL Database"

    log_info "Starting PostgreSQL service..."
    systemctl start postgresql
    systemctl enable postgresql

    # Generate secure password
    DB_PASSWORD=$(openssl rand -base64 32)
    DB_USER="trading_user"
    DB_NAME="trading_bot"

    log_info "Creating database and user..."

    sudo -u postgres psql << EOF
-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Create database
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

    # Save credentials
    CREDENTIALS_FILE="/root/.trading_bot_db_credentials"
    cat > "$CREDENTIALS_FILE" << EOF
Database: $DB_NAME
User: $DB_USER
Password: $DB_PASSWORD
Connection String: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
EOF

    chmod 600 "$CREDENTIALS_FILE"

    log_success "Database created successfully"
    log_info "Credentials saved to: $CREDENTIALS_FILE"

    # Export for later use
    export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
}

# Step 7: Create Application User
create_app_user() {
    log_step "STEP 7: Creating Application User"

    if id "$APP_USER" &>/dev/null; then
        log_info "User '$APP_USER' already exists"
    else
        log_info "Creating user '$APP_USER'..."
        useradd -m -s /bin/bash "$APP_USER"
        log_success "User '$APP_USER' created"
    fi

    # Set password
    log_info "Please set password for user '$APP_USER'"
    passwd "$APP_USER"

    # Setup SSH directory
    mkdir -p "/home/$APP_USER/.ssh"
    chmod 700 "/home/$APP_USER/.ssh"
    chown -R "$APP_USER:$APP_USER" "/home/$APP_USER/.ssh"

    log_success "Application user configured"
}

# Step 8: Clone/Setup Project
setup_project() {
    log_step "STEP 8: Setting Up Project"

    PROJECT_PATH="/home/$APP_USER/NovemberAITrader"

    if [ -d "$PROJECT_PATH" ]; then
        log_info "Project directory already exists at: $PROJECT_PATH"
        log_info "Pulling latest changes..."
        cd "$PROJECT_PATH"
        sudo -u "$APP_USER" git pull || true
    else
        log_info "Project will be cloned by application user"
        log_warning "Please clone the repository manually as '$APP_USER' user"
        log_warning "Or copy this directory to: $PROJECT_PATH"
    fi

    # Copy environment file
    if [ -f "$PROJECT_DIR/$ENV_FILE" ]; then
        log_info "Copying environment configuration..."
        cp "$PROJECT_DIR/$ENV_FILE" "$PROJECT_PATH/.env.production"

        # Update DATABASE_URL in env file
        if [ -n "$DATABASE_URL" ]; then
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|g" "$PROJECT_PATH/.env.production"
        fi

        chown "$APP_USER:$APP_USER" "$PROJECT_PATH/.env.production"
        chmod 600 "$PROJECT_PATH/.env.production"

        log_success "Environment file configured"
        log_warning "Please update the following in .env.production:"
        log_warning "  - BYBIT_API_KEY"
        log_warning "  - BYBIT_API_SECRET"
        log_warning "  - NEBIUS_JWT_TOKEN"
        log_warning "  - CRON_SECRET_KEY"
    fi
}

# Step 9: Install Application Dependencies
install_app_dependencies() {
    log_step "STEP 9: Installing Application Dependencies"

    PROJECT_PATH="/home/$APP_USER/NovemberAITrader"

    if [ -d "$PROJECT_PATH" ]; then
        cd "$PROJECT_PATH"

        log_info "Installing npm dependencies..."
        sudo -u "$APP_USER" npm ci --production

        log_info "Generating Prisma client..."
        sudo -u "$APP_USER" npx prisma generate

        log_info "Running database migrations..."
        sudo -u "$APP_USER" npx prisma migrate deploy || true

        log_info "Building application..."
        sudo -u "$APP_USER" npm run build

        log_success "Application dependencies installed and built"
    else
        log_warning "Project directory not found, skipping dependency installation"
    fi
}

# Step 10: Create Systemd Service
create_systemd_service() {
    log_step "STEP 10: Creating Systemd Service"

    SERVICE_FILE="/etc/systemd/system/trading-bot.service"
    PROJECT_PATH="/home/$APP_USER/NovemberAITrader"

    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Bybit Margin Trading Bot
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$PROJECT_PATH
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=$PROJECT_PATH/.env.production
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=trading-bot

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$PROJECT_PATH/logs $PROJECT_PATH/backups

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    systemctl daemon-reload

    log_success "Systemd service created"
    log_info "Service file: $SERVICE_FILE"
}

# Step 11: Setup Nginx Reverse Proxy (Optional)
setup_nginx() {
    log_step "STEP 11: Setting Up Nginx (Optional)"

    read -p "Do you want to setup Nginx reverse proxy? (y/n): " SETUP_NGINX

    if [ "$SETUP_NGINX" != "y" ] && [ "$SETUP_NGINX" != "Y" ]; then
        log_info "Skipping Nginx setup"
        return
    fi

    NGINX_CONF="/etc/nginx/sites-available/trading-bot"

    cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $VM_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Enable site
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test configuration
    nginx -t

    # Restart Nginx
    systemctl restart nginx
    systemctl enable nginx

    log_success "Nginx configured and started"
}

# Step 12: Setup Log Directories
setup_logging() {
    log_step "STEP 12: Setting Up Logging"

    PROJECT_PATH="/home/$APP_USER/NovemberAITrader"

    mkdir -p "$PROJECT_PATH/logs"
    mkdir -p "$PROJECT_PATH/backups"

    chown -R "$APP_USER:$APP_USER" "$PROJECT_PATH/logs"
    chown -R "$APP_USER:$APP_USER" "$PROJECT_PATH/backups"

    log_success "Log directories created"
}

# Step 13: Create Backup Script
create_backup_script() {
    log_step "STEP 13: Creating Database Backup Script"

    BACKUP_SCRIPT="/usr/local/bin/backup-trading-db.sh"

    cat > "$BACKUP_SCRIPT" << 'EOF'
#!/bin/bash
# Database backup script

BACKUP_DIR="/var/backups/trading_bot"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/trading_bot_$TIMESTAMP.sql.gz"

# Perform backup
sudo -u postgres pg_dump trading_bot | gzip > "$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "trading_bot_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

    chmod +x "$BACKUP_SCRIPT"

    # Add to crontab (daily at 2 AM)
    (crontab -l 2>/dev/null; echo "0 2 * * * $BACKUP_SCRIPT") | crontab -

    log_success "Backup script created and scheduled"
}

# Main deployment function
main() {
    log_step "Starting Nebius VM Deployment"

    install_system_dependencies
    install_nodejs
    install_docker
    configure_firewall
    configure_fail2ban
    setup_database
    create_app_user
    setup_project
    install_app_dependencies
    create_systemd_service
    setup_nginx
    setup_logging
    create_backup_script

    # Final summary
    echo ""
    echo -e "${MAGENTA}========================================${NC}"
    echo -e "${GREEN}Deployment Completed Successfully!${NC}"
    echo -e "${MAGENTA}========================================${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "1. Edit environment file: ${YELLOW}nano /home/$APP_USER/NovemberAITrader/.env.production${NC}"
    echo -e "2. Update BYBIT_API_KEY, BYBIT_API_SECRET, and NEBIUS_JWT_TOKEN"
    echo -e "3. Start the service: ${YELLOW}sudo systemctl start trading-bot${NC}"
    echo -e "4. Check status: ${YELLOW}sudo systemctl status trading-bot${NC}"
    echo -e "5. View logs: ${YELLOW}sudo journalctl -u trading-bot -f${NC}"
    echo ""
    echo -e "${BLUE}Access URLs:${NC}"
    echo -e "  - Direct: ${YELLOW}http://$VM_IP:3000${NC}"
    echo -e "  - Via Nginx: ${YELLOW}http://$VM_IP${NC}"
    echo ""
    echo -e "${BLUE}Database Credentials:${NC}"
    echo -e "  - Saved in: ${YELLOW}/root/.trading_bot_db_credentials${NC}"
    echo ""
    echo -e "${GREEN}Happy Trading! 🚀${NC}"
    echo ""
}

# Run main function
main
