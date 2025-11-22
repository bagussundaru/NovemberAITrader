# 🚀 PM2 Process Manager Guide

## Overview
Aplikasi Pramilupu Trading AI sekarang berjalan menggunakan PM2 (Process Manager 2), yang memungkinkan aplikasi berjalan di background dan tetap aktif bahkan setelah terminal ditutup.

---

## ✅ Status Saat Ini

**Aplikasi:** `pramilupu-trading-ai`  
**Status:** 🟢 **ONLINE**  
**URL:** http://103.126.116.150:3000  
**Mode:** Development (with Turbopack)  
**Auto-restart:** Enabled  
**Memory Limit:** 1GB

---

## 📋 Quick Commands

### Menggunakan Helper Script:
```bash
cd /home/pramilupu/pramilupu/NovemberAITrader

# Lihat status
./pm2-commands.sh status

# Lihat logs
./pm2-commands.sh logs

# Restart aplikasi
./pm2-commands.sh restart

# Stop aplikasi
./pm2-commands.sh stop

# Start aplikasi
./pm2-commands.sh start
```

### Menggunakan PM2 Langsung:
```bash
# Status
pm2 status

# Logs (live)
pm2 logs pramilupu-trading-ai

# Logs (last 100 lines)
pm2 logs pramilupu-trading-ai --lines 100

# Restart
pm2 restart pramilupu-trading-ai

# Stop
pm2 stop pramilupu-trading-ai

# Start
pm2 start pramilupu-trading-ai

# Delete from PM2
pm2 delete pramilupu-trading-ai

# Monitor (dashboard)
pm2 monit

# Detailed info
pm2 info pramilupu-trading-ai
```

---

## 🔧 Configuration

File konfigurasi: `ecosystem.config.js`

```javascript
{
  name: 'pramilupu-trading-ai',
  script: 'npm run dev',
  instances: 1,
  autorestart: true,
  max_memory_restart: '1G',
  env: {
    NODE_ENV: 'development',
    PORT: 3000
  }
}
```

---

## 📊 Monitoring

### Real-time Monitoring:
```bash
pm2 monit
```

### Check Memory & CPU:
```bash
pm2 status
```

### View Logs:
```bash
# All logs
pm2 logs pramilupu-trading-ai

# Error logs only
pm2 logs pramilupu-trading-ai --err

# Output logs only
pm2 logs pramilupu-trading-ai --out

# Last 50 lines
pm2 logs pramilupu-trading-ai --lines 50
```

---

## 🔄 Auto-restart Features

PM2 akan otomatis restart aplikasi jika:
- ✅ Aplikasi crash
- ✅ Memory usage > 1GB
- ✅ Uncaught exception
- ✅ Server reboot (jika startup script diaktifkan)

---

## 💾 Persistence

### Save Current Process List:
```bash
pm2 save
```

### Setup Auto-start on Boot:
```bash
# Generate startup script
pm2 startup

# Copy dan jalankan command yang muncul (dengan sudo)
# Contoh:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u pramilupu --hp /home/pramilupu

# Save process list
pm2 save
```

---

## 📁 Log Files

Lokasi log files:
```
/home/pramilupu/pramilupu/NovemberAITrader/logs/
├── pm2-error.log      # Error logs
├── pm2-out.log        # Output logs
└── pm2-combined.log   # Combined logs
```

### View Log Files:
```bash
# Error logs
tail -f logs/pm2-error.log

# Output logs
tail -f logs/pm2-out.log

# Combined logs
tail -f logs/pm2-combined.log
```

### Clear Logs:
```bash
pm2 flush pramilupu-trading-ai
```

---

## 🚨 Troubleshooting

### Aplikasi Tidak Start:
```bash
# Check logs
pm2 logs pramilupu-trading-ai --err

# Check status
pm2 status

# Restart
pm2 restart pramilupu-trading-ai
```

### Memory Issues:
```bash
# Check memory usage
pm2 status

# Restart to free memory
pm2 restart pramilupu-trading-ai

# Increase memory limit (edit ecosystem.config.js)
max_memory_restart: '2G'
```

### Port Already in Use:
```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Restart PM2 app
pm2 restart pramilupu-trading-ai
```

### Aplikasi Crash Loop:
```bash
# Stop aplikasi
pm2 stop pramilupu-trading-ai

# Check error logs
pm2 logs pramilupu-trading-ai --err --lines 100

# Fix issue, then start
pm2 start pramilupu-trading-ai
```

---

## 🔄 Update & Deployment

### After Code Changes:
```bash
# Method 1: Restart (fast)
pm2 restart pramilupu-trading-ai

# Method 2: Reload (zero-downtime, for production)
pm2 reload pramilupu-trading-ai

# Method 3: Stop and Start (clean restart)
pm2 stop pramilupu-trading-ai
pm2 start pramilupu-trading-ai
```

### After npm install:
```bash
pm2 restart pramilupu-trading-ai
```

### After .env changes:
```bash
pm2 restart pramilupu-trading-ai
```

---

## 📈 Performance Tuning

### Increase Memory Limit:
Edit `ecosystem.config.js`:
```javascript
max_memory_restart: '2G'  // Change from 1G to 2G
```

Then restart:
```bash
pm2 restart pramilupu-trading-ai
```

### Enable Cluster Mode (Production):
Edit `ecosystem.config.js`:
```javascript
instances: 'max'  // Use all CPU cores
exec_mode: 'cluster'
```

---

## 🛡️ Security

### Protect PM2 Daemon:
```bash
# Set PM2 home directory permissions
chmod 700 ~/.pm2
```

### Secure Log Files:
```bash
chmod 600 logs/*.log
```

---

## 📝 Useful PM2 Commands

```bash
# List all processes
pm2 list

# Show process details
pm2 show pramilupu-trading-ai

# Reset restart counter
pm2 reset pramilupu-trading-ai

# Update PM2
npm install -g pm2@latest
pm2 update

# Dump process list
pm2 dump

# Resurrect saved processes
pm2 resurrect

# Kill PM2 daemon
pm2 kill
```

---

## 🎯 Best Practices

1. **Always save after changes:**
   ```bash
   pm2 save
   ```

2. **Monitor regularly:**
   ```bash
   pm2 monit
   ```

3. **Check logs for errors:**
   ```bash
   pm2 logs pramilupu-trading-ai --err
   ```

4. **Restart after updates:**
   ```bash
   pm2 restart pramilupu-trading-ai
   ```

5. **Keep PM2 updated:**
   ```bash
   npm install -g pm2@latest
   pm2 update
   ```

---

## 🔗 Useful Links

- **PM2 Documentation:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **PM2 GitHub:** https://github.com/Unitech/pm2
- **Application URL:** http://103.126.116.150:3000

---

## ✅ Verification

Check if everything is working:

```bash
# 1. Check PM2 status
pm2 status

# 2. Check application health
curl http://localhost:3000/api/health

# 3. Check logs
pm2 logs pramilupu-trading-ai --lines 20

# 4. Check from browser
# Open: http://103.126.116.150:3000
```

---

**Last Updated:** November 8, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
