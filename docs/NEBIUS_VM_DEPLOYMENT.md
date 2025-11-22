# Panduan Deployment ke Nebius VM
## Bybit Margin Trading Bot - IP: 103.126.116.150

---

## 📋 Daftar Isi

1. [Prasyarat](#prasyarat)
2. [Persiapan Sebelum Deployment](#persiapan-sebelum-deployment)
3. [Deployment Otomatis](#deployment-otomatis)
4. [Konfigurasi Bybit API](#konfigurasi-bybit-api)
5. [Konfigurasi Nebius AI](#konfigurasi-nebius-ai)
6. [Manajemen Service](#manajemen-service)
7. [Monitoring dan Logging](#monitoring-dan-logging)
8. [Keamanan](#keamanan)
9. [Troubleshooting](#troubleshooting)
10. [Emergency Procedures](#emergency-procedures)

---

## 🔧 Prasyarat

### Spesifikasi VM Minimum
- **OS**: Ubuntu 20.04 LTS atau lebih baru
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 20GB minimum
- **CPU**: 2 cores minimum
- **Network**: Koneksi internet stabil

### Akses yang Diperlukan
- ✅ SSH access ke VM dengan IP: `103.126.116.150`
- ✅ Root/sudo privileges
- ✅ Bybit API Key dan Secret (dengan permission untuk margin trading)
- ✅ Nebius JWT Token (dengan billing quota aktif)

### Port yang Digunakan
- **3000**: Trading Bot Application
- **80**: HTTP (Nginx - optional)
- **443**: HTTPS (Nginx + SSL - optional)
- **5432**: PostgreSQL Database (local only)
- **22**: SSH

---

## 📦 Persiapan Sebelum Deployment

### 1. Koneksi ke VM

```bash
# Koneksi via SSH
ssh root@103.126.116.150

# Atau jika menggunakan SSH key
ssh -i /path/to/your/key.pem root@103.126.116.150
```

### 2. Clone Repository

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/NovemberAITrader.git
cd NovemberAITrader
```

Atau jika sudah ada repository local, upload menggunakan `scp`:

```bash
# Dari komputer local
scp -r /path/to/NovemberAITrader root@103.126.116.150:/root/
```

### 3. Persiapkan API Keys

Sebelum deployment, siapkan informasi berikut:

#### Bybit API Configuration
1. Login ke [Bybit](https://www.bybit.com)
2. Buka **API Management**
3. Create API Key dengan permissions:
   - ✅ Read Position
   - ✅ Trade
   - ✅ Read Balance
   - ⚠️ **JANGAN** aktifkan Withdrawal permission
4. Catat:
   - API Key
   - API Secret
   - Pastikan IP 103.126.116.150 di-whitelist

#### Nebius Configuration
1. Login ke [Nebius Platform](https://nebius.ai)
2. Buka **Billing** dan pastikan ada quota tersedia
3. Generate JWT Token dari dashboard
4. Catat JWT Token

---

## 🚀 Deployment Otomatis

### Quick Deployment (Recommended)

```bash
# 1. Masuk ke directory project
cd /root/NovemberAITrader

# 2. Berikan permission execute pada script
chmod +x scripts/deploy-nebius-vm.sh

# 3. Jalankan deployment script
sudo bash scripts/deploy-nebius-vm.sh
```

Script akan otomatis melakukan:
- ✅ Install system dependencies (Node.js, PostgreSQL, Nginx, dll)
- ✅ Setup firewall dan security (UFW, fail2ban)
- ✅ Create database dan user
- ✅ Setup application user (`tradingbot`)
- ✅ Install application dependencies
- ✅ Build aplikasi
- ✅ Create systemd service
- ✅ Setup logging dan backup

**Waktu deployment**: 10-15 menit

### Deployment Manual (Step by Step)

Jika ingin kontrol lebih detail, ikuti langkah berikut:

#### Step 1: System Dependencies
```bash
sudo bash scripts/ubuntu-vm-setup.sh
```

#### Step 2: Security Configuration
```bash
sudo bash scripts/ubuntu-security-setup.sh
```

#### Step 3: Database Setup
```bash
sudo bash scripts/ubuntu-database-setup.sh
```

#### Step 4: Application Setup
```bash
# Switch ke user tradingbot
su - tradingbot

# Masuk ke project directory
cd /root/NovemberAITrader  # atau /home/tradingbot/NovemberAITrader

# Run application setup
bash scripts/ubuntu-app-setup.sh
```

---

## 🔑 Konfigurasi Bybit API

### 1. Edit Environment File

```bash
# Edit file konfigurasi
nano /home/tradingbot/NovemberAITrader/.env.production
```

### 2. Update Bybit Configuration

```env
# ========================================
# Bybit Configuration (Margin Trading)
# ========================================
BYBIT_API_URL="https://api.bybit.com"
BYBIT_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
BYBIT_API_SECRET="YOUR_ACTUAL_API_SECRET_HERE"
BYBIT_TESTNET="false"  # PENTING: false untuk live trading

# Account Type (UNIFIED untuk margin)
BYBIT_ACCOUNT_TYPE="UNIFIED"
```

### 3. Configure Risk Management

**SANGAT PENTING** untuk margin trading:

```env
# Maximum daily loss (USDT)
# Rekomendasi: 2-5% dari total modal
MAX_DAILY_LOSS="200"

# Maximum position size per trade (USDT)
# Rekomendasi: tidak lebih dari 20% total modal
MAX_POSITION_SIZE="500"

# Stop loss percentage
# Rekomendasi: 2-5% untuk margin trading
STOP_LOSS_PERCENTAGE="3"

# Maximum concurrent positions
# Rekomendasi: 2-5 positions
MAX_OPEN_POSITIONS="3"

# Emergency stop (auto-stop pada critical errors)
EMERGENCY_STOP_ENABLED="true"

# Leverage settings
# CAUTION: Higher leverage = Higher risk!
# Rekomendasi: 2-5x untuk pemula, max 10x
MAX_LEVERAGE="5"

# Margin mode
# isolated = margin terpisah per position (RECOMMENDED)
# cross = margin shared (HIGHER RISK)
MARGIN_MODE="isolated"
```

### 4. Set Trading Pairs

```env
# Trading pairs (comma-separated)
# Gunakan pairs dengan liquidity tinggi
TRADING_PAIRS="BTC/USDT,ETH/USDT"

# Starting capital
START_MONEY="100"
```

---

## 🤖 Konfigurasi Nebius AI

### Update Nebius Settings

```env
# ========================================
# Nebius AI Configuration
# ========================================
NEBIUS_API_URL="https://api.nebius.ai"
NEBIUS_JWT_TOKEN="YOUR_ACTUAL_NEBIUS_JWT_TOKEN"
NEBIUS_MODEL="default"
NEBIUS_MAX_RETRIES="3"
NEBIUS_TIMEOUT="30000"
```

### Generate Secret Key

```bash
# Generate random secret key untuk CRON
openssl rand -base64 32
```

Update di `.env.production`:
```env
CRON_SECRET_KEY="<hasil_generate_di_atas>"
```

---

## 🎮 Manajemen Service

### Start Trading Bot

```bash
# Start service
sudo systemctl start trading-bot

# Enable auto-start on boot
sudo systemctl enable trading-bot

# Check status
sudo systemctl status trading-bot
```

### Stop Trading Bot

```bash
# Stop service
sudo systemctl stop trading-bot

# Disable auto-start
sudo systemctl disable trading-bot
```

### Restart Trading Bot

```bash
# Restart service
sudo systemctl restart trading-bot
```

### View Service Status

```bash
# Detailed status
sudo systemctl status trading-bot -l

# Check if running
sudo systemctl is-active trading-bot

# Check if enabled
sudo systemctl is-enabled trading-bot
```

---

## 📊 Monitoring dan Logging

### View Real-time Logs

```bash
# Live logs (follow mode)
sudo journalctl -u trading-bot -f

# Last 100 lines
sudo journalctl -u trading-bot -n 100

# Logs from today
sudo journalctl -u trading-bot --since today

# Logs from last hour
sudo journalctl -u trading-bot --since "1 hour ago"

# Filter by error level
sudo journalctl -u trading-bot -p err
```

### Application Logs

```bash
# View application log file
tail -f /home/tradingbot/NovemberAITrader/logs/trading-bot.log

# Last 50 lines
tail -n 50 /home/tradingbot/NovemberAITrader/logs/trading-bot.log

# Search for errors
grep -i "error" /home/tradingbot/NovemberAITrader/logs/trading-bot.log
```

### Access Dashboard

```bash
# Via browser, akses:
http://103.126.116.150:3000

# Atau jika menggunakan Nginx:
http://103.126.116.150
```

Dashboard menampilkan:
- Trading activity
- Open positions
- Account balance
- Performance metrics
- Risk management status

---

## 🛡️ Keamanan

### Firewall Status

```bash
# Check firewall status
sudo ufw status verbose

# Check allowed ports
sudo ufw status numbered
```

### fail2ban Protection

```bash
# Check fail2ban status
sudo fail2ban-client status

# Check SSH jail
sudo fail2ban-client status sshd

# Unban IP if needed
sudo fail2ban-client set sshd unbanip <IP_ADDRESS>
```

### Database Security

```bash
# View database credentials
sudo cat /root/.trading_bot_db_credentials

# Backup credentials (jika perlu)
sudo cp /root/.trading_bot_db_credentials ~/db_credentials_backup.txt
```

### API Key Security

**PENTING:**
- ✅ Jangan share API keys
- ✅ Whitelist hanya IP 103.126.116.150 di Bybit
- ✅ Disable withdrawal permission
- ✅ Rotate API keys setiap 3-6 bulan
- ✅ Monitor API usage regularly

### Environment File Security

```bash
# Check permissions (should be 600)
ls -la /home/tradingbot/NovemberAITrader/.env.production

# Fix if needed
sudo chmod 600 /home/tradingbot/NovemberAITrader/.env.production
sudo chown tradingbot:tradingbot /home/tradingbot/NovemberAITrader/.env.production
```

---

## 🔍 Troubleshooting

### Service Won't Start

```bash
# 1. Check service status
sudo systemctl status trading-bot

# 2. View detailed errors
sudo journalctl -u trading-bot -n 50

# 3. Check application logs
tail -n 100 /home/tradingbot/NovemberAITrader/logs/trading-bot.log

# 4. Verify environment file
sudo -u tradingbot cat /home/tradingbot/NovemberAITrader/.env.production

# 5. Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process (replace PID with actual process ID)
sudo kill -9 <PID>

# Or kill all node processes
sudo pkill -f node
```

### Database Connection Error

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
psql -U trading_user -d trading_bot -h localhost -c "SELECT 1"

# If password needed, get from credentials file
sudo cat /root/.trading_bot_db_credentials
```

### Bybit API Errors

```bash
# Common errors:

# 1. "Invalid API key" - Check API key correct
# 2. "IP not whitelisted" - Add 103.126.116.150 to Bybit IP whitelist
# 3. "Insufficient permissions" - Enable required permissions di API settings
# 4. "Rate limit exceeded" - Wait beberapa menit dan coba lagi
```

### Nebius API Errors

```bash
# Common errors:

# 1. "Invalid JWT token" - Generate token baru dari Nebius dashboard
# 2. "Quota exceeded" - Check billing quota di Nebius platform
# 3. "Timeout" - Increase NEBIUS_TIMEOUT di .env
```

### Application Not Accessible

```bash
# 1. Check if service running
sudo systemctl status trading-bot

# 2. Check firewall
sudo ufw status

# 3. Allow port 3000 if blocked
sudo ufw allow 3000/tcp

# 4. Check if port listening
sudo netstat -tuln | grep 3000

# 5. Test locally
curl http://localhost:3000/api/health

# 6. Test from outside
curl http://103.126.116.150:3000/api/health
```

### Build Errors

```bash
# Clean and rebuild
cd /home/tradingbot/NovemberAITrader

# Remove build artifacts
sudo -u tradingbot rm -rf .next node_modules

# Reinstall dependencies
sudo -u tradingbot npm install

# Rebuild
sudo -u tradingbot npm run build

# Restart service
sudo systemctl restart trading-bot
```

---

## 🚨 Emergency Procedures

### Emergency Stop Trading

```bash
# Method 1: Stop service immediately
sudo systemctl stop trading-bot

# Method 2: Kill all node processes
sudo pkill -f "node.*next"

# Method 3: Emergency stop via API (if accessible)
curl -X POST http://localhost:3000/api/trading/emergency-stop \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_CRON_SECRET_KEY"}'
```

### Close All Positions Manually

Login ke Bybit web/mobile dan close semua positions manual jika bot error.

### Database Backup

```bash
# Manual backup
sudo /usr/local/bin/backup-trading-db.sh

# List backups
ls -lh /var/backups/trading_bot/

# Restore from backup
gunzip -c /var/backups/trading_bot/trading_bot_YYYYMMDD_HHMMSS.sql.gz | \
  sudo -u postgres psql trading_bot
```

### Restore from Backup

```bash
# 1. Stop service
sudo systemctl stop trading-bot

# 2. Find latest backup
ls -lt /var/backups/trading_bot/ | head

# 3. Restore database
gunzip -c /var/backups/trading_bot/trading_bot_LATEST.sql.gz | \
  sudo -u postgres psql trading_bot

# 4. Restart service
sudo systemctl start trading-bot
```

### Rollback Deployment

```bash
# If something goes wrong, rollback to previous version

cd /home/tradingbot/NovemberAITrader

# 1. Stop service
sudo systemctl stop trading-bot

# 2. Checkout previous version
sudo -u tradingbot git log --oneline  # Find commit hash
sudo -u tradingbot git checkout <commit_hash>

# 3. Rebuild
sudo -u tradingbot npm install
sudo -u tradingbot npm run build

# 4. Restart
sudo systemctl start trading-bot
```

---

## 📈 Performance Optimization

### Monitor System Resources

```bash
# CPU and memory
htop

# Disk usage
df -h

# Disk I/O
iostat -x 1

# Network
iftop
```

### Optimize PostgreSQL

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf

# Recommended settings for 4GB RAM:
# shared_buffers = 1GB
# effective_cache_size = 3GB
# work_mem = 16MB
# maintenance_work_mem = 256MB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Optimize Node.js

```bash
# Edit systemd service
sudo nano /etc/systemd/system/trading-bot.service

# Add Node.js memory limit:
[Service]
Environment=NODE_OPTIONS="--max-old-space-size=2048"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart trading-bot
```

---

## 📚 Useful Commands Cheat Sheet

```bash
# Service Management
sudo systemctl start trading-bot
sudo systemctl stop trading-bot
sudo systemctl restart trading-bot
sudo systemctl status trading-bot

# Logs
sudo journalctl -u trading-bot -f
tail -f /home/tradingbot/NovemberAITrader/logs/trading-bot.log

# Database
psql -U trading_user -d trading_bot -h localhost
sudo /usr/local/bin/backup-trading-db.sh

# Firewall
sudo ufw status
sudo ufw allow 3000/tcp
sudo ufw delete allow 3000/tcp

# Process Management
sudo lsof -i :3000
sudo pkill -f node
ps aux | grep node

# System Monitoring
htop
df -h
free -h
netstat -tuln

# Git Operations
git pull
git status
git log --oneline
```

---

## 📞 Support & Resources

### Documentation
- **Full Deployment Guide**: `docs/UBUNTU_VM_DEPLOYMENT.md`
- **Quick Reference**: `docs/DEPLOYMENT_QUICK_REFERENCE.md`
- **Pre-Deployment Checklist**: `docs/PRE_DEPLOYMENT_CHECKLIST.md`

### Scripts
- **Deployment**: `scripts/deploy-nebius-vm.sh`
- **Verification**: `scripts/verify-deployment.sh`
- **Database Backup**: `/usr/local/bin/backup-trading-db.sh`

### Important Files
- **Environment Config**: `/home/tradingbot/NovemberAITrader/.env.production`
- **Database Credentials**: `/root/.trading_bot_db_credentials`
- **Service File**: `/etc/systemd/system/trading-bot.service`
- **Logs**: `/home/tradingbot/NovemberAITrader/logs/trading-bot.log`

### External Resources
- [Bybit API Documentation](https://bybit-exchange.github.io/docs/)
- [Nebius AI Documentation](https://nebius.ai/docs)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)

---

## ⚠️ Important Notes

### Margin Trading Risks

**WARNING**: Margin trading carries significant risk!

- ⚠️ Bisa kehilangan lebih dari modal awal
- ⚠️ Higher leverage = Higher risk
- ⚠️ Market volatility bisa trigger liquidation
- ⚠️ Selalu gunakan stop loss
- ⚠️ Mulai dengan leverage kecil (2-5x)
- ⚠️ JANGAN gunakan dana yang tidak bisa Anda loss

### Best Practices

1. **Start Small**: Mulai dengan capital kecil untuk testing
2. **Use Testnet First**: Test di Bybit testnet sebelum live
3. **Monitor Regularly**: Check dashboard minimal 2x sehari
4. **Set Alerts**: Configure alerts untuk position changes
5. **Regular Backups**: Backup database secara rutin
6. **Update System**: Keep system dan dependencies updated
7. **Security First**: Jangan pernah share credentials

### Recommended Monitoring Schedule

- **Every Hour**: Check if service running
- **Every 4 Hours**: Review open positions
- **Daily**: Review performance dan logs
- **Weekly**: Check system resources dan backups
- **Monthly**: Review dan rotate API keys

---

## ✅ Deployment Checklist

Sebelum go-live, pastikan:

- [ ] VM accessible via SSH
- [ ] System dependencies installed
- [ ] PostgreSQL database setup
- [ ] Application built successfully
- [ ] Environment variables configured
- [ ] Bybit API keys configured dan tested
- [ ] Nebius JWT token valid
- [ ] Firewall configured
- [ ] fail2ban running
- [ ] Service auto-start enabled
- [ ] Backup script scheduled
- [ ] Dashboard accessible
- [ ] Logs writing properly
- [ ] Risk management configured
- [ ] Emergency stop tested

---

**Selamat Trading! 🚀📈**

**Remember**: Past performance tidak guarantee future results. Trade dengan bijak!

---

*Last Updated: 2025-11-22*
*Version: 1.0*
