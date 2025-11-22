# Ubuntu VM Deployment Guide

This guide provides step-by-step instructions for deploying the Live Trading Bot AI on an Ubuntu VM.

## Prerequisites

- Ubuntu 20.04 LTS or higher
- Minimum 4GB RAM (8GB recommended)
- 20GB disk space
- Root or sudo access
- Internet connection

## Deployment Overview

The deployment process consists of 4 main steps:

1. **System Dependencies Installation** - Install Node.js, PostgreSQL, Docker, and Nginx
2. **Security Configuration** - Setup firewall, SSH hardening, fail2ban, and application user
3. **Database Setup** - Create PostgreSQL database and configure backups
4. **Application Setup** - Clone repository, install dependencies, and configure environment

## Step-by-Step Deployment

### Step 1: System Dependencies Installation

Run the system setup script as root:

```bash
sudo bash scripts/ubuntu-vm-setup.sh
```

This script will install:
- Node.js 18+
- PostgreSQL 14+
- Docker and Docker Compose
- Nginx web server

**Expected Duration:** 5-10 minutes

### Step 2: Security Configuration

Run the security setup script as root:

```bash
sudo bash scripts/ubuntu-security-setup.sh
```

This script will:
- Configure UFW firewall with appropriate rules
- Install and configure fail2ban for brute force protection
- Harden SSH configuration
- Create a non-root application user

**Important Notes:**
- You'll be prompted to create an application user (default: `tradingbot`)
- Set a strong password for the application user
- Add your SSH public key to `/home/tradingbot/.ssh/authorized_keys`
- Test SSH login with the new user before logging out

**Expected Duration:** 5 minutes

### Step 3: Database Setup

Run the database setup script as root:

```bash
sudo bash scripts/ubuntu-database-setup.sh
```

This script will:
- Create `trading_bot` database
- Create `trading_user` with secure password
- Configure PostgreSQL for local connections
- Setup automated daily backups

**Important Notes:**
- Save the database credentials displayed at the end
- The `DATABASE_URL` will be needed for application configuration
- Credentials are also saved to `/root/.trading_bot_db_credentials`

**Expected Duration:** 2-3 minutes

### Step 4: Application Setup

Switch to the application user and run the app setup script:

```bash
# Switch to application user
su - tradingbot

# Run application setup
bash scripts/ubuntu-app-setup.sh
```

Or if you're already in the application directory:

```bash
cd /path/to/NovemberAITrader
bash scripts/ubuntu-app-setup.sh
```

This script will:
- Clone the repository (or use current directory)
- Install npm dependencies
- Configure environment variables
- Run database migrations
- Build the application
- Create systemd service file

**You'll be prompted for:**
- Repository URL (if cloning)
- Nebius API credentials
- Binance Futures API credentials
- Database URL (from Step 3)
- Application port (default: 3000)

**Expected Duration:** 5-10 minutes (depending on npm install)

## Post-Deployment Configuration

### Option 1: Run with Systemd (Recommended)

Install and start the systemd service:

```bash
# Create log directory
sudo mkdir -p /var/log/trading-bot
sudo chown tradingbot:tradingbot /var/log/trading-bot

# Install service
sudo cp /tmp/trading-bot.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable trading-bot
sudo systemctl start trading-bot

# Check status
sudo systemctl status trading-bot

# View logs
sudo journalctl -u trading-bot -f
```

### Option 2: Run Manually

```bash
cd ~/NovemberAITrader
npm start
```

Or use the convenience scripts:

```bash
# Start
~/NovemberAITrader/start-bot.sh

# Stop
~/NovemberAITrader/stop-bot.sh
```

### Option 3: Run with Docker Compose

```bash
cd ~/NovemberAITrader
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Nginx Reverse Proxy Configuration (Optional)

To serve the application through Nginx with SSL:

1. Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/trading-bot
```

2. Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/trading-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. (Optional) Setup SSL with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Accessing the Application

Once deployed, access the trading bot dashboard at:

- **Direct Access:** `http://your-server-ip:3000`
- **With Nginx:** `http://your-domain.com`
- **With SSL:** `https://your-domain.com`

## Monitoring and Maintenance

### View Application Logs

**Systemd:**
```bash
sudo journalctl -u trading-bot -f
```

**Manual/Script:**
```bash
tail -f ~/NovemberAITrader/logs/app.log
```

**Docker:**
```bash
docker compose logs -f
```

### Check Application Status

**Systemd:**
```bash
sudo systemctl status trading-bot
```

**Docker:**
```bash
docker compose ps
```

### Database Backups

Backups are automatically created daily at 2 AM and stored in `/var/backups/trading_bot/`.

**Manual Backup:**
```bash
sudo /usr/local/bin/backup-trading-db.sh
```

**Restore from Backup:**
```bash
gunzip -c /var/backups/trading_bot/trading_bot_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql trading_bot
```

### Update Application

```bash
cd ~/NovemberAITrader
git pull
npm install
npm run build
sudo systemctl restart trading-bot
```

## Troubleshooting

### Application Won't Start

1. Check logs for errors:
   ```bash
   sudo journalctl -u trading-bot -n 50
   ```

2. Verify environment variables:
   ```bash
   cat ~/NovemberAITrader/.env.production
   ```

3. Test database connection:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

### Database Connection Issues

1. Check PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Verify database exists:
   ```bash
   sudo -u postgres psql -l | grep trading_bot
   ```

3. Test connection:
   ```bash
   psql -U trading_user -d trading_bot -h localhost
   ```

### Firewall Issues

1. Check firewall status:
   ```bash
   sudo ufw status verbose
   ```

2. Ensure required ports are open:
   ```bash
   sudo ufw allow 3000/tcp
   ```

### Permission Issues

1. Ensure application user owns the directory:
   ```bash
   sudo chown -R tradingbot:tradingbot ~/NovemberAITrader
   ```

2. Check file permissions:
   ```bash
   ls -la ~/NovemberAITrader
   ```

## Security Best Practices

1. **Keep System Updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Monitor fail2ban:**
   ```bash
   sudo fail2ban-client status
   sudo fail2ban-client status sshd
   ```

3. **Review Logs Regularly:**
   ```bash
   sudo journalctl -u trading-bot --since "1 day ago"
   ```

4. **Rotate API Keys Periodically:**
   - Update Binance API keys every 90 days
   - Update Nebius JWT token as needed

5. **Monitor Disk Space:**
   ```bash
   df -h
   ```

6. **Setup Monitoring Alerts:**
   - Configure email notifications for critical events
   - Setup uptime monitoring (e.g., UptimeRobot)

## Performance Optimization

1. **Enable PostgreSQL Connection Pooling:**
   - Configure in `DATABASE_URL` with `?connection_limit=10`

2. **Setup Redis for Caching (Optional):**
   ```bash
   sudo apt install redis-server
   sudo systemctl enable redis-server
   ```

3. **Configure Node.js Memory Limits:**
   ```bash
   # In systemd service file
   Environment=NODE_OPTIONS="--max-old-space-size=4096"
   ```

4. **Enable Nginx Caching:**
   - Configure static asset caching in Nginx

## Support and Resources

- **Documentation:** `/docs` directory
- **Logs:** `/var/log/trading-bot/`
- **Database Backups:** `/var/backups/trading_bot/`
- **Configuration:** `~/NovemberAITrader/.env.production`

## Quick Reference Commands

```bash
# Start/Stop/Restart
sudo systemctl start trading-bot
sudo systemctl stop trading-bot
sudo systemctl restart trading-bot

# View Logs
sudo journalctl -u trading-bot -f

# Check Status
sudo systemctl status trading-bot

# Update Application
cd ~/NovemberAITrader && git pull && npm install && npm run build && sudo systemctl restart trading-bot

# Database Backup
sudo /usr/local/bin/backup-trading-db.sh

# Check Firewall
sudo ufw status

# Monitor Resources
htop
df -h
free -h
```
