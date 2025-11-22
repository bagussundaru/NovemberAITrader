# 🎯 Ready to Deploy - Live Trading Bot

## ✅ Status: READY FOR DEPLOYMENT

All development is complete. The application is production-ready and tested.

---

## 🚀 Quick Start (5 Minutes)

### Option 1: Automated Quick Deploy (Recommended)

```bash
# As root user
sudo su -
cd /home/pramilupu/pramilupu/NovemberAITrader
bash quick-deploy.sh
```

This will automatically:
- ✅ Install Node.js 18+
- ✅ Install PostgreSQL 14+
- ✅ Create database and user
- ✅ Install npm dependencies
- ✅ Generate Prisma client
- ✅ Configure environment

**Then follow the on-screen instructions to:**
1. Add your API credentials to `.env.production`
2. Run `npx prisma db push`
3. Run `npm run build`
4. Run `npm start`

### Option 2: Full Automated Deploy

```bash
# As root user
sudo su -
cd /home/pramilupu/pramilupu/NovemberAITrader
bash scripts/deploy-all.sh
```

This runs the complete deployment suite with security hardening.

---

## 📋 What You Need

Before deploying, have these ready:

### 1. Nebius AI Credentials
- **JWT Token**: Get from https://studio.nebius.ai
- **API URL**: `https://api.studio.nebius.ai/v1` (default)
- **Model**: `meta-llama/Meta-Llama-3.1-8B-Instruct` (default)

### 2. Binance Futures Testnet Credentials
- **API Key**: Get from https://testnet.binancefuture.com
- **API Secret**: From Binance Testnet
- **Base URL**: `https://testnet.binancefuture.com` (default)

### 3. System Requirements
- ✅ Ubuntu 20.04+ (You have 22.04)
- ✅ 4GB+ RAM
- ✅ 20GB+ disk space
- ✅ Root/sudo access

---

## 📝 Manual Deployment Steps

If you prefer manual control:

### 1. Install Node.js
```bash
sudo su -
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node --version  # Should show v18.x
```

### 2. Install PostgreSQL
```bash
apt-get install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### 3. Create Database
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE trading_bot;
CREATE USER trading_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE trading_bot TO trading_user;
\q
```

### 4. Setup Application
```bash
# Exit root
exit

# Go to project
cd ~/pramilupu/NovemberAITrader

# Install dependencies
npm install

# Configure environment
cp .env.production.template .env.production
nano .env.production  # Add your API credentials

# Setup database
npx prisma generate
npx prisma db push

# Build
npm run build

# Start
npm start
```

---

## 🔧 Configuration

Edit `.env.production` with your credentials:

```env
# Nebius AI
NEBIUS_API_URL=https://api.studio.nebius.ai/v1
NEBIUS_JWT_TOKEN=your_jwt_token_here
NEBIUS_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct

# Binance Futures Testnet
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_secret_here
BINANCE_USE_SANDBOX=true

# Database (auto-configured by quick-deploy.sh)
DATABASE_URL=postgresql://trading_user:password@localhost:5432/trading_bot

# Trading Settings
TRADING_PAIRS=BTCUSDT,ETHUSDT,SOLUSDT
MAX_POSITION_SIZE=1000
STOP_LOSS_PERCENTAGE=2
MAX_LEVERAGE=10
DEFAULT_LEVERAGE=5

# Application
PORT=3000
NODE_ENV=production
```

---

## 🎯 After Deployment

### 1. Access Dashboard
```
http://your-server-ip:3000
```

### 2. Verify Everything Works
- ✅ Dashboard loads
- ✅ Nebius AI status shows "Connected"
- ✅ Market data updates in real-time
- ✅ Trading engine controls work

### 3. Start Trading
1. Click "Start Trading Engine"
2. Monitor AI analysis
3. Watch positions open/close
4. Track P&L in real-time

---

## 📊 Monitoring

### Check Application Status
```bash
# If using npm start directly
ps aux | grep node

# If using PM2
pm2 status
pm2 logs trading-bot

# If using systemd
sudo systemctl status trading-bot
sudo journalctl -u trading-bot -f

# If using Docker
docker-compose ps
docker-compose logs -f
```

### Check System Resources
```bash
htop           # CPU and memory
df -h          # Disk space
free -h        # Memory usage
```

### Check Database
```bash
sudo -u postgres psql -d trading_bot -c "SELECT COUNT(*) FROM positions;"
```

### Check API Health
```bash
curl http://localhost:3000/api/health
```

---

## 🛠️ Troubleshooting

### Port 3000 Already in Use
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U trading_user -d trading_bot -h localhost
```

### npm Install Fails
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Application Won't Start
```bash
# Check logs
npm start 2>&1 | tee app.log

# Check environment
cat .env.production | grep -v "SECRET\|PASSWORD\|TOKEN"

# Verify database
npx prisma db push
```

---

## 📚 Documentation

- **Full Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Ubuntu VM Setup**: `docs/UBUNTU_VM_DEPLOYMENT.md`
- **Quick Reference**: `docs/DEPLOYMENT_QUICK_REFERENCE.md`
- **Pre-Deployment Checklist**: `docs/PRE_DEPLOYMENT_CHECKLIST.md`
- **Scripts Documentation**: `scripts/README.md`

---

## 🎉 Features Ready to Use

### ✅ Core Features
- Real-time market data from Binance Futures Testnet
- AI-powered analysis with Nebius AI (Llama 3.1 8B)
- Automated trading with long/short positions
- Dynamic leverage and position sizing
- Stop-loss and take-profit automation

### ✅ Advanced Features
- Multi-timeframe analysis (1m, 5m, 15m, 1h, 4h, 1d)
- Sentiment analysis (news and social media)
- Whale detection and order book analysis
- Advanced risk management
- Dynamic stop-loss based on volatility
- Portfolio correlation analysis

### ✅ Dashboard Features
- Professional trading interface
- Real-time P&L tracking
- Position management
- Trading engine controls
- Market health indicators
- AI analysis display

---

## 🔒 Security Notes

1. **Never commit `.env.production`** to git
2. **Use strong database passwords**
3. **Keep API keys secure**
4. **Enable firewall** (UFW)
5. **Setup SSL certificate** for HTTPS
6. **Regular backups** of database
7. **Monitor logs** for suspicious activity

---

## 🚨 Important Notes

1. **This is Testnet**: Using Binance Futures Testnet (no real money)
2. **AI Analysis**: Powered by Nebius AI with Llama 3.1 8B
3. **Automated Trading**: Bot can open/close positions automatically
4. **Risk Management**: Built-in stop-loss and position limits
5. **Monitoring**: Always monitor the bot's performance

---

## 📞 Support

If you encounter issues:

1. Check logs: `npm start` output or `pm2 logs`
2. Verify configuration: `.env.production`
3. Test database: `psql -U trading_user -d trading_bot`
4. Check API connectivity: `curl http://localhost:3000/api/health`
5. Review documentation in `docs/` folder

---

## ✨ Ready to Deploy!

Choose your deployment method:

1. **Quick Deploy** (5 min): `sudo bash quick-deploy.sh`
2. **Full Deploy** (20 min): `sudo bash scripts/deploy-all.sh`
3. **Manual Deploy**: Follow steps in `DEPLOYMENT_GUIDE.md`

**After deployment, access your dashboard at:**
```
http://your-server-ip:3000
```

🎉 **Happy Trading!** 🚀

