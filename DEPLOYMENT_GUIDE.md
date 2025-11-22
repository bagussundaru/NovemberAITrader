# 🚀 Live Trading Bot - Deployment Guide

## Current Status
- ✅ Application Code: COMPLETE
- ✅ Deployment Scripts: READY
- ⏳ System Setup: PENDING
- ⏳ Application Running: PENDING

## Quick Deployment (Recommended)

### Step 1: Run as Root User

```bash
# Switch to root
sudo su -

# Navigate to project
cd /home/pramilupu/pramilupu/NovemberAITrader

# Run master deployment script
bash scripts/deploy-all.sh
```

The script will:
1. ✅ Install Node.js 18+
2. ✅ Install PostgreSQL 14+
3. ✅ Install Docker & Docker Compose
4. ✅ Install Nginx
5. ✅ Configure firewall (UFW)
6. ✅ Setup fail2ban
7. ✅ Create database and user
8. ✅ Setup automated backups

### Step 2: Setup Application (as regular user)

```bash
# Exit from root
exit

# Navigate to project
cd ~/pramilupu/NovemberAITrader

# Install dependencies
npm install

# Setup environment
cp .env.production.template .env.production
nano .env.production  # Edit with your credentials

# Run Prisma migrations
npx prisma generate
npx prisma db push

# Build application
npm run build

# Start application
npm start
```

## Alternative: Step-by-Step Manual Deployment

### 1. Install Node.js

```bash
sudo su -
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node --version  # Should show v18.x
npm --version
```

### 2. Install PostgreSQL

```bash
apt-get install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
psql --version  # Should show 14+
```

### 3. Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE trading_bot;
CREATE USER trading_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE trading_bot TO trading_user;
\q
```

### 4. Install Docker (Optional)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### 5. Configure Firewall

```bash
# Install and configure UFW
apt-get install -y ufw

# Allow necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Application

# Enable firewall
ufw --force enable
ufw status
```

### 6. Setup Application

```bash
# Exit root and go back to regular user
exit

cd ~/pramilupu/NovemberAITrader

# Install dependencies
npm install

# Configure environment
cp .env.production.template .env.production

# Edit .env.production with your credentials:
# - NEBIUS_JWT_TOKEN
# - BINANCE_API_KEY
# - BINANCE_API_SECRET
# - DATABASE_URL
nano .env.production

# Setup database
npx prisma generate
npx prisma db push

# Build application
npm run build
```

### 7. Start Application

**Option A: Direct Start (for testing)**
```bash
npm start
# Access: http://your-server-ip:3000
```

**Option B: Using PM2 (recommended for production)**
```bash
# Install PM2
sudo npm install -g pm2

# Start application
pm2 start npm --name "trading-bot" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it gives you

# Monitor
pm2 status
pm2 logs trading-bot
```

**Option C: Using Docker**
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Option D: Using Systemd**
```bash
# Create service file
sudo nano /etc/systemd/system/trading-bot.service

# Add this content:
[Unit]
Description=Live Trading Bot
After=network.target postgresql.service

[Service]
Type=simple
User=pramilupu
WorkingDirectory=/home/pramilupu/pramilupu/NovemberAITrader
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable trading-bot
sudo systemctl start trading-bot
sudo systemctl status trading-bot
```

## Environment Variables Required

Edit `.env.production` with these values:

```env
# Nebius AI Configuration
NEBIUS_API_URL=https://api.studio.nebius.ai/v1
NEBIUS_JWT_TOKEN=your_nebius_jwt_token_here
NEBIUS_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct

# Binance Futures Testnet
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_secret_key
BINANCE_USE_SANDBOX=true

# Database
DATABASE_URL=postgresql://trading_user:your_password@localhost:5432/trading_bot

# Trading Configuration
TRADING_PAIRS=BTCUSDT,ETHUSDT,SOLUSDT
MAX_POSITION_SIZE=1000
STOP_LOSS_PERCENTAGE=2
MAX_LEVERAGE=10
DEFAULT_LEVERAGE=5

# Application
PORT=3000
NODE_ENV=production
```

## Verification Steps

### 1. Check Services

```bash
# Check Node.js
node --version

# Check PostgreSQL
sudo systemctl status postgresql

# Check database connection
psql -U trading_user -d trading_bot -h localhost -c "SELECT 1;"

# Check application
curl http://localhost:3000/api/health
```

### 2. Check Application Logs

```bash
# If using systemd
sudo journalctl -u trading-bot -f

# If using PM2
pm2 logs trading-bot

# If using Docker
docker-compose logs -f

# If running directly
# Check terminal output
```

### 3. Access Dashboard

Open browser and go to:
```
http://your-server-ip:3000
```

You should see:
- ✅ Trading dashboard
- ✅ Nebius AI status indicator
- ✅ Market data for BTC, ETH, SOL, etc.
- ✅ Trading engine controls

## Troubleshooting

### Issue: Port 3000 already in use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

### Issue: Database connection failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep trading_bot

# Test connection
psql -U trading_user -d trading_bot -h localhost
```

### Issue: npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Prisma migration fails

```bash
# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset

# Or manually create tables
npx prisma db push --accept-data-loss
```

## Monitoring Commands

```bash
# System resources
htop
df -h
free -h

# Application status
sudo systemctl status trading-bot  # If using systemd
pm2 status                         # If using PM2
docker-compose ps                  # If using Docker

# View logs
sudo journalctl -u trading-bot -f  # Systemd
pm2 logs trading-bot               # PM2
docker-compose logs -f             # Docker

# Database
sudo -u postgres psql -d trading_bot -c "SELECT COUNT(*) FROM positions;"

# Network
sudo netstat -tulpn | grep :3000
```

## Security Recommendations

1. **Change default passwords**
2. **Setup SSL certificate** (Let's Encrypt)
3. **Configure Nginx reverse proxy**
4. **Enable fail2ban**
5. **Regular backups**
6. **Monitor logs**
7. **Keep system updated**

## Next Steps After Deployment

1. ✅ Access dashboard at `http://your-server-ip:3000`
2. ✅ Configure trading parameters
3. ✅ Add API credentials via dashboard
4. ✅ Start trading engine
5. ✅ Monitor performance
6. ✅ Setup SSL (optional but recommended)
7. ✅ Configure alerts (optional)

## Support

- **Documentation**: `docs/UBUNTU_VM_DEPLOYMENT.md`
- **Quick Reference**: `docs/DEPLOYMENT_QUICK_REFERENCE.md`
- **Scripts**: `scripts/README.md`
- **Verification**: `bash scripts/verify-deployment.sh`

---

**Ready to deploy!** 🚀

Choose your deployment method and follow the steps above.
