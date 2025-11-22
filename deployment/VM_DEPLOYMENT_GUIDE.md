# 🚀 AI Trading Bot - VM Deployment Guide

Panduan lengkap untuk deploy trading bot ke Virtual Machine (VM) dengan konfigurasi production-ready.

## 📋 Daftar Isi

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Manual Deployment](#manual-deployment)
4. [Post-Deployment](#post-deployment)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

---

## Prerequisites

### Sistem Requirements

- **OS**: Ubuntu 20.04 LTS atau lebih baru
- **RAM**: Minimum 2GB (Recommended 4GB+)
- **Storage**: Minimum 20GB free space
- **CPU**: 2 cores atau lebih
- **Network**: Koneksi internet stabil

### Yang Dibutuhkan

1. VM dengan Ubuntu Server
2. Root access (sudo privileges)
3. SSH access ke VM
4. API credentials:
   - Binance API key & secret (testnet atau mainnet)
   - Nebius AI JWT token
   - Database password (akan di-generate otomatis)

---

## Quick Start

### 🎯 One-Command Deployment

Cara tercepat untuk deploy trading bot:

```bash
# 1. Clone repository
git clone https://github.com/bagussundaru/NovemberAITrader.git
cd NovemberAITrader

# 2. Pindah ke branch yang benar
git checkout claude/deploy-trading-bot-vm-01F6J7YCwWgM6D98PviJM47J

# 3. Jalankan master deployment script
sudo bash deployment/deploy-vm.sh
```

Script ini akan otomatis:
- ✅ Install semua dependencies
- ✅ Setup database PostgreSQL
- ✅ Konfigurasi firewall & security
- ✅ Setup environment variables
- ✅ Konfigurasi Nginx reverse proxy
- ✅ Deploy aplikasi
- ✅ Setup monitoring & logging
- ✅ Start semua services

**Waktu estimasi**: 10-15 menit

### Setelah Deployment

1. **Edit API credentials**:
```bash
sudo nano /root/NovemberAITrader/.env.production
```

2. **Restart service**:
```bash
sudo systemctl restart trading-bot
```

3. **Akses dashboard**:
```
http://YOUR_SERVER_IP/
```

---

## Manual Deployment

Jika ingin deploy step-by-step:

### Step 1: Install Dependencies

```bash
sudo bash deployment/scripts/install-dependencies.sh
```

Menginstall:
- Node.js 20.x LTS
- PostgreSQL 15
- Nginx
- PM2
- UFW Firewall
- fail2ban

### Step 2: Setup Database

```bash
sudo bash deployment/scripts/setup-database.sh
```

Setup:
- Create database `trading_bot`
- Create user `trading_user` dengan password random
- Configure PostgreSQL
- Setup automated backups (daily 2 AM)
- Save credentials ke `/root/.trading-bot-credentials`

### Step 3: Configure Security

```bash
sudo bash deployment/scripts/setup-security.sh
```

Konfigurasi:
- UFW firewall rules
- fail2ban untuk protection
- Automatic security updates
- SSH hardening
- Kernel hardening
- Security monitoring

### Step 4: Setup Environment

```bash
sudo bash deployment/scripts/setup-environment.sh
```

Create:
- `.env.production` file
- Log directories
- Log rotation configuration
- Monitoring directories

### Step 5: Setup Nginx (Optional)

```bash
sudo bash deployment/scripts/setup-nginx.sh
```

Configure:
- Nginx reverse proxy
- Rate limiting
- Gzip compression
- Security headers

### Step 6: Deploy Application

```bash
sudo bash deployment/scripts/deploy-app.sh
```

Process:
- Install npm dependencies
- Setup Prisma
- Push database schema
- Build Next.js application
- Install systemd services
- Start application

---

## Post-Deployment

### 1. Verify Services

```bash
# Check service status
sudo systemctl status trading-bot
sudo systemctl status trading-bot-monitor
sudo systemctl status postgresql
sudo systemctl status nginx

# Check application health
curl http://localhost:3000/api/health
```

### 2. Configure API Keys

Edit `.env.production`:

```bash
sudo nano /root/NovemberAITrader/.env.production
```

Required:
```env
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_secret
NEBIUS_JWT_TOKEN=your_nebius_token
```

Optional:
```env
GATE_API_KEY=your_gate_api_key
GATE_API_SECRET=your_gate_secret
DEEPSEEK_API_KEY=your_deepseek_key
OPENROUTER_API_KEY=your_openrouter_key
```

Restart setelah edit:
```bash
sudo systemctl restart trading-bot
```

### 3. Setup SSL/HTTPS (Recommended)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate (replace dengan domain Anda)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal sudah dikonfigurasi otomatis
```

### 4. Configure Domain (Optional)

Update Nginx config:
```bash
sudo nano /etc/nginx/sites-available/trading-bot.conf
```

Change `server_name _;` to `server_name yourdomain.com;`

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Monitoring & Maintenance

### Service Management

```bash
# Start service
sudo systemctl start trading-bot

# Stop service
sudo systemctl stop trading-bot

# Restart service
sudo systemctl restart trading-bot

# View status
sudo systemctl status trading-bot

# Enable auto-start on boot
sudo systemctl enable trading-bot

# Disable auto-start
sudo systemctl disable trading-bot
```

### View Logs

```bash
# Real-time application logs
sudo journalctl -u trading-bot -f

# Monitor health check
sudo journalctl -u trading-bot-monitor -f

# Application output log
sudo tail -f /var/log/trading-bot/output.log

# Error log
sudo tail -f /var/log/trading-bot/error.log

# Nginx access log
sudo tail -f /var/log/nginx/trading-bot-access.log

# Security monitor
sudo tail -f /var/log/trading-bot/security-monitor.log
```

### View Metrics

```bash
# Today's metrics
sudo cat /var/log/trading-bot/metrics/metrics-$(date +%Y%m%d).json | jq

# System metrics API
curl http://localhost:3000/api/system-metrics | jq

# Trading metrics
curl http://localhost:3000/api/dashboard-data | jq
```

### Database Management

```bash
# Connect to database
sudo -u postgres psql -d trading_bot

# View database credentials
sudo cat /root/.trading-bot-credentials

# Manual backup
sudo /usr/local/bin/backup-trading-bot-db.sh

# View backups
sudo ls -lah /var/backups/trading-bot/

# Restore from backup
gunzip < /var/backups/trading-bot/trading_bot_20250122_020000.sql.gz | sudo -u postgres psql trading_bot
```

### Health Monitoring

Health check script runs automatically setiap menit via systemd.

Manual health check:
```bash
# Run health monitor manually
sudo bash /root/NovemberAITrader/deployment/scripts/health-monitor.sh

# View monitor logs
sudo tail -f /var/log/trading-bot/health-monitor.log
```

### Metrics Collection

Metrics dikumpulkan setiap 5 menit via systemd timer.

```bash
# Check timer status
sudo systemctl status trading-bot-metrics.timer

# View collected metrics
sudo ls -lah /var/log/trading-bot/metrics/

# Manual metrics collection
sudo bash /root/NovemberAITrader/deployment/scripts/collect-metrics.sh
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check service status
sudo systemctl status trading-bot

# View detailed logs
sudo journalctl -u trading-bot -n 100 --no-pager

# Check if port 3000 is in use
sudo lsof -i :3000

# Kill process on port 3000
sudo kill -9 $(sudo lsof -t -i:3000)

# Restart service
sudo systemctl restart trading-bot
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
PGPASSWORD=your_password psql -U trading_user -d trading_bot -h localhost -c "SELECT 1;"

# View database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Nginx Issues

```bash
# Test Nginx configuration
sudo nginx -t

# View Nginx error log
sudo tail -f /var/log/nginx/trading-bot-error.log

# Restart Nginx
sudo systemctl restart nginx

# Check if Nginx is listening
sudo netstat -tuln | grep :80
```

### High Memory/CPU Usage

```bash
# Check resource usage
htop

# Check trading bot process
ps aux | grep "npm start"

# Check memory by service
sudo systemctl status trading-bot | grep Memory

# Restart if needed
sudo systemctl restart trading-bot
```

### Firewall Issues

```bash
# Check UFW status
sudo ufw status numbered

# Allow specific port
sudo ufw allow 3000/tcp

# Reload firewall
sudo ufw reload

# Check fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### Build Errors

```bash
cd /root/NovemberAITrader

# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
rm -rf .next

# Reinstall
npm install

# Rebuild
npm run build
```

---

## Security Best Practices

### 1. SSH Security

```bash
# Generate SSH key (on local machine)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy to server
ssh-copy-id root@your_server_ip

# Disable password authentication (after SSH key setup)
sudo nano /etc/ssh/sshd_config.d/99-trading-bot-hardening.conf
# Uncomment: PasswordAuthentication no

# Restart SSH
sudo systemctl restart sshd
```

### 2. Change Default Ports (Optional)

```bash
# Change SSH port
sudo nano /etc/ssh/sshd_config
# Add: Port 2222

# Update firewall
sudo ufw allow 2222/tcp
sudo systemctl restart sshd

# Update fail2ban
sudo nano /etc/fail2ban/jail.local
# Update port in [sshd] section
```

### 3. Regular Updates

```bash
# Manual security updates
sudo apt update
sudo apt upgrade -y

# Check for security updates
sudo unattended-upgrade --dry-run
```

### 4. Backup Strategy

Automated backups:
- Database: Daily at 2 AM
- Retention: 7 days
- Location: `/var/backups/trading-bot/`

Manual backup:
```bash
# Full backup
sudo tar -czf /var/backups/trading-bot-full-$(date +%Y%m%d).tar.gz \
    /root/NovemberAITrader \
    /var/log/trading-bot \
    /root/.trading-bot-credentials

# Database only
sudo /usr/local/bin/backup-trading-bot-db.sh
```

### 5. Monitor Security Logs

```bash
# Failed login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# fail2ban status
sudo fail2ban-client status sshd

# Security monitor log
sudo tail -f /var/log/trading-bot/security-monitor.log

# UFW logs
sudo tail -f /var/log/ufw.log
```

---

## Configuration Files

### Systemd Services

- **Main Service**: `/etc/systemd/system/trading-bot.service`
- **Monitor Service**: `/etc/systemd/system/trading-bot-monitor.service`
- **Metrics Service**: `/etc/systemd/system/trading-bot-metrics.service`
- **Metrics Timer**: `/etc/systemd/system/trading-bot-metrics.timer`

### Configuration Files

- **Environment**: `/root/NovemberAITrader/.env.production`
- **Credentials**: `/root/.trading-bot-credentials`
- **Nginx**: `/etc/nginx/sites-available/trading-bot.conf`
- **Firewall**: `/etc/ufw/`
- **fail2ban**: `/etc/fail2ban/jail.local`

### Log Files

- **Application Output**: `/var/log/trading-bot/output.log`
- **Application Errors**: `/var/log/trading-bot/error.log`
- **Health Monitor**: `/var/log/trading-bot/health-monitor.log`
- **Metrics**: `/var/log/trading-bot/metrics/`
- **Nginx Access**: `/var/log/nginx/trading-bot-access.log`
- **Nginx Error**: `/var/log/nginx/trading-bot-error.log`

---

## Useful Commands Reference

### Quick Status Check

```bash
# All-in-one status check
sudo systemctl status trading-bot postgresql nginx fail2ban

# Application health
curl http://localhost:3000/api/health

# View last 50 log lines
sudo journalctl -u trading-bot -n 50 --no-pager
```

### Performance Monitoring

```bash
# System resources
htop
df -h
free -h

# Network connections
sudo netstat -tuln

# Active connections to trading bot
sudo netstat -an | grep :3000
```

### Emergency Commands

```bash
# Force restart all services
sudo systemctl restart postgresql nginx trading-bot

# Kill all node processes
sudo pkill -9 node

# Start fresh
sudo systemctl stop trading-bot
cd /root/NovemberAITrader
rm -rf .next node_modules
npm install
npm run build
sudo systemctl start trading-bot
```

---

## Support & Resources

- **Project Repository**: https://github.com/bagussundaru/NovemberAITrader
- **Documentation**: `/root/NovemberAITrader/README.md`
- **Deployment Scripts**: `/root/NovemberAITrader/deployment/scripts/`

---

## Changelog

### Version 1.0.0 (2025-01-22)

- ✅ Initial VM deployment system
- ✅ Automated installation scripts
- ✅ Systemd service configuration
- ✅ Health monitoring system
- ✅ Metrics collection
- ✅ Security hardening
- ✅ Nginx reverse proxy
- ✅ Automated backups
- ✅ Comprehensive logging

---

**Happy Trading! 🚀📈**
