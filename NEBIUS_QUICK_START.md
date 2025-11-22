# 🚀 Nebius VM Quick Start Guide
## Deploy Bybit Margin Trading Bot dalam 15 Menit

---

## Langkah Cepat (TL;DR)

```bash
# 1. SSH ke VM
ssh root@103.126.116.150

# 2. Clone/Upload project
git clone YOUR_REPO_URL NovemberAITrader
# atau scp -r /local/path/NovemberAITrader root@103.126.116.150:/root/

# 3. Deploy
cd NovemberAITrader
chmod +x scripts/deploy-nebius-vm.sh
sudo bash scripts/deploy-nebius-vm.sh

# 4. Configure API keys
nano /home/tradingbot/NovemberAITrader/.env.production
# Update: BYBIT_API_KEY, BYBIT_API_SECRET, NEBIUS_JWT_TOKEN

# 5. Start trading bot
sudo systemctl start trading-bot

# 6. Check status
sudo systemctl status trading-bot

# 7. Access dashboard
# Open browser: http://103.126.116.150:3000
```

---

## 📋 Persiapan (5 menit)

### 1. API Keys yang Dibutuhkan

#### Bybit API
1. Login [Bybit](https://www.bybit.com) → API Management
2. Create API Key dengan permissions:
   - ✅ Read Position
   - ✅ Trade
   - ✅ Read Balance
   - ❌ NO Withdrawal
3. Whitelist IP: `103.126.116.150`
4. Simpan: API Key & Secret

#### Nebius Token
1. Login [Nebius](https://nebius.ai)
2. Pastikan ada billing quota
3. Generate JWT Token
4. Simpan token

---

## 🚀 Deployment (10 menit)

### Option A: Automatic Deployment (Recommended)

```bash
# SSH ke VM
ssh root@103.126.116.150

# Clone project (atau upload via scp)
cd /root
git clone YOUR_REPO_URL NovemberAITrader

# Run deployment
cd NovemberAITrader
chmod +x scripts/deploy-nebius-vm.sh
sudo bash scripts/deploy-nebius-vm.sh
```

Script akan install semua yang dibutuhkan:
- Node.js, PostgreSQL, Nginx
- Firewall & Security
- Database setup
- Application build

### Option B: Docker Deployment

```bash
# SSH ke VM
ssh root@103.126.116.150

# Clone project
cd /root
git clone YOUR_REPO_URL NovemberAITrader
cd NovemberAITrader

# Copy environment file
cp .env.nebius .env.production

# Update API keys
nano .env.production

# Deploy with Docker
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## ⚙️ Konfigurasi (3 menit)

### Edit Environment File

```bash
nano /home/tradingbot/NovemberAITrader/.env.production
```

### Update Required Fields

```env
# Bybit API (REQUIRED)
BYBIT_API_KEY="paste_your_api_key_here"
BYBIT_API_SECRET="paste_your_api_secret_here"
BYBIT_TESTNET="false"  # false for LIVE trading

# Nebius AI (REQUIRED)
NEBIUS_JWT_TOKEN="paste_your_jwt_token_here"

# Security (REQUIRED)
CRON_SECRET_KEY="generate_random_string_here"

# Risk Management (Adjust based on your risk tolerance)
MAX_DAILY_LOSS="200"        # Max loss per day in USDT
MAX_POSITION_SIZE="500"     # Max size per trade
STOP_LOSS_PERCENTAGE="3"    # Stop loss %
MAX_OPEN_POSITIONS="3"      # Max concurrent positions
MAX_LEVERAGE="5"            # Leverage (2-5x recommended)
MARGIN_MODE="isolated"      # isolated or cross

# Trading Pairs
TRADING_PAIRS="BTC/USDT,ETH/USDT"
START_MONEY="100"
```

Generate random secret:
```bash
openssl rand -base64 32
```

---

## 🎬 Start Trading

### Start Service

```bash
sudo systemctl start trading-bot
sudo systemctl enable trading-bot
```

### Check Status

```bash
sudo systemctl status trading-bot
```

Should show: `Active: active (running)`

### View Logs

```bash
# Live logs
sudo journalctl -u trading-bot -f

# Last 50 lines
sudo journalctl -u trading-bot -n 50
```

### Access Dashboard

Open browser:
```
http://103.126.116.150:3000
```

---

## ✅ Verification

### Quick Health Check

```bash
# 1. Service running?
sudo systemctl is-active trading-bot

# 2. Port listening?
sudo lsof -i :3000

# 3. Database connection?
psql -U trading_user -d trading_bot -h localhost -c "SELECT 1"

# 4. API health check
curl http://localhost:3000/api/health

# 5. External access
curl http://103.126.116.150:3000/api/health
```

All should return success!

---

## 🛠️ Common Commands

### Service Management
```bash
sudo systemctl start trading-bot      # Start
sudo systemctl stop trading-bot       # Stop
sudo systemctl restart trading-bot    # Restart
sudo systemctl status trading-bot     # Status
```

### Logs
```bash
sudo journalctl -u trading-bot -f              # Live logs
sudo journalctl -u trading-bot --since today   # Today's logs
tail -f /home/tradingbot/NovemberAITrader/logs/trading-bot.log
```

### Emergency Stop
```bash
sudo systemctl stop trading-bot
```

---

## 🚨 Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u trading-bot -n 100

# Check configuration
nano /home/tradingbot/NovemberAITrader/.env.production

# Restart PostgreSQL
sudo systemctl restart postgresql

# Rebuild application
cd /home/tradingbot/NovemberAITrader
sudo -u tradingbot npm run build
sudo systemctl restart trading-bot
```

### Can't Access Dashboard

```bash
# Allow port in firewall
sudo ufw allow 3000/tcp

# Check if running
sudo lsof -i :3000

# Test locally
curl http://localhost:3000
```

### Bybit API Errors

1. Check API key correct
2. Check IP whitelisted: 103.126.116.150
3. Check permissions enabled
4. Regenerate API key if needed

---

## 📊 Monitoring

### Check Dashboard
- Open: `http://103.126.116.150:3000`
- Monitor positions, balance, P&L

### View Live Logs
```bash
sudo journalctl -u trading-bot -f
```

### Check System Resources
```bash
htop        # CPU/Memory
df -h       # Disk space
free -h     # Memory usage
```

---

## 🔐 Security Checklist

- [x] Firewall enabled (`sudo ufw status`)
- [x] fail2ban running (`sudo systemctl status fail2ban`)
- [x] SSH key authentication
- [x] API keys secured in `.env.production` (chmod 600)
- [x] Database password strong
- [x] IP whitelisted di Bybit
- [x] No withdrawal permission di API key
- [x] Emergency stop enabled

---

## 📚 Dokumentasi Lengkap

- **Full Guide**: `docs/NEBIUS_VM_DEPLOYMENT.md`
- **Quick Reference**: `docs/DEPLOYMENT_QUICK_REFERENCE.md`
- **Troubleshooting**: Lihat section Troubleshooting di NEBIUS_VM_DEPLOYMENT.md

---

## ⚠️ IMPORTANT WARNINGS

### Margin Trading Risks
- ⚠️ Bisa rugi lebih dari modal
- ⚠️ Gunakan leverage rendah (2-5x)
- ⚠️ Selalu set stop loss
- ⚠️ Mulai dengan capital kecil
- ⚠️ Monitor secara regular

### Best Practices
1. **Test di Testnet dulu** (`BYBIT_TESTNET="true"`)
2. **Start dengan capital kecil** ($100-500)
3. **Monitor setiap hari**
4. **Set risk limits** sesuai risk tolerance
5. **Backup database** secara rutin

---

## 🆘 Need Help?

### Check Logs
```bash
sudo journalctl -u trading-bot -f
```

### View Full Documentation
```bash
cat docs/NEBIUS_VM_DEPLOYMENT.md
```

### Emergency Stop
```bash
sudo systemctl stop trading-bot
```

---

## 🎯 Next Steps After Deployment

1. ✅ Monitor first 24 hours closely
2. ✅ Verify positions opening/closing correctly
3. ✅ Check P&L calculations accurate
4. ✅ Test emergency stop
5. ✅ Setup backup schedule
6. ✅ Configure monitoring alerts
7. ✅ Document your trading strategy

---

**Happy Trading! 🚀📈**

*Remember: Trade responsibly. Never risk more than you can afford to lose.*

---

**Quick Support:**
- Logs: `sudo journalctl -u trading-bot -f`
- Stop: `sudo systemctl stop trading-bot`
- Start: `sudo systemctl start trading-bot`
- Status: `sudo systemctl status trading-bot`

---

*Last Updated: 2025-11-22*
