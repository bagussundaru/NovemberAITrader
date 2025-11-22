#!/bin/bash

# PostgreSQL Database Setup Script
# This script creates the trading bot database and user with appropriate permissions
# Run with: sudo bash ubuntu-database-setup.sh

set -e  # Exit on error

echo "=========================================="
echo "Live Trading Bot - Database Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Database configuration
DB_NAME="trading_bot"
DB_USER="trading_user"

# Generate a random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo "Step 1: Creating PostgreSQL database and user..."
echo ""

# Create database and user
sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE $DB_NAME;

-- Create user with password
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to the database and grant schema privileges
\c $DB_NAME

-- Grant schema privileges (for PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

-- Show databases
\l

-- Quit
\q
EOF

echo ""
echo "✓ Database '$DB_NAME' created successfully"
echo "✓ User '$DB_USER' created with privileges"
echo ""

# Configure PostgreSQL for remote connections (optional)
echo "Step 2: Configuring PostgreSQL for connections..."

# Find PostgreSQL version and config directory
PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"

# Backup original configuration
cp "$PG_CONFIG_DIR/postgresql.conf" "$PG_CONFIG_DIR/postgresql.conf.backup"
cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup"

# Configure PostgreSQL to listen on localhost (default)
# Uncomment the line below to allow remote connections
# sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONFIG_DIR/postgresql.conf"

# Add connection rules to pg_hba.conf
# Allow local connections
cat >> "$PG_CONFIG_DIR/pg_hba.conf" << EOF

# Trading Bot Application
local   $DB_NAME        $DB_USER                                md5
host    $DB_NAME        $DB_USER        127.0.0.1/32            md5
host    $DB_NAME        $DB_USER        ::1/128                 md5

# Uncomment below to allow remote connections (not recommended for production)
# host    $DB_NAME        $DB_USER        0.0.0.0/0               md5
EOF

# Restart PostgreSQL to apply changes
systemctl restart postgresql

echo "✓ PostgreSQL configured for local connections"
echo ""

# Setup automated backups
echo "Step 3: Setting up automated database backups..."

# Create backup directory
BACKUP_DIR="/var/backups/trading_bot"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Create backup script
cat > /usr/local/bin/backup-trading-db.sh << 'BACKUP_SCRIPT'
#!/bin/bash

# Database backup script
DB_NAME="trading_bot"
DB_USER="trading_user"
BACKUP_DIR="/var/backups/trading_bot"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Create backup
sudo -u postgres pg_dump $DB_NAME | gzip > "$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
BACKUP_SCRIPT

# Make backup script executable
chmod +x /usr/local/bin/backup-trading-db.sh

# Create daily cron job for backups (runs at 2 AM)
cat > /etc/cron.d/trading-bot-backup << 'CRON_JOB'
# Daily database backup at 2 AM
0 2 * * * root /usr/local/bin/backup-trading-db.sh >> /var/log/trading-bot-backup.log 2>&1
CRON_JOB

echo "✓ Automated daily backups configured (runs at 2 AM)"
echo "✓ Backups stored in: $BACKUP_DIR"
echo "✓ Retention: 7 days"
echo ""

# Save database credentials to a secure file
CREDENTIALS_FILE="/root/.trading_bot_db_credentials"
cat > "$CREDENTIALS_FILE" << EOF
# Trading Bot Database Credentials
# Generated on: $(date)

DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Connection string for application
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
EOF

chmod 600 "$CREDENTIALS_FILE"

echo "=========================================="
echo "Database Setup Complete!"
echo "=========================================="
echo ""
echo "Database Information:"
echo "  Database Name: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  Database Password: $DB_PASSWORD"
echo ""
echo "Connection String:"
echo "  DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo "IMPORTANT: Save these credentials securely!"
echo "Credentials also saved to: $CREDENTIALS_FILE"
echo ""
echo "Backup Configuration:"
echo "  Backup Directory: $BACKUP_DIR"
echo "  Backup Schedule: Daily at 2 AM"
echo "  Retention Period: 7 days"
echo "  Manual Backup: /usr/local/bin/backup-trading-db.sh"
echo ""
echo "Next steps:"
echo "  1. Save the DATABASE_URL to your .env.production file"
echo "  2. Run application setup script: bash scripts/ubuntu-app-setup.sh"
echo ""
