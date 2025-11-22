# 📦 Trading Bot - VM Deployment Package

Deployment package lengkap untuk deploy AI Trading Bot ke Virtual Machine.

## 📁 Structure

```
deployment/
├── deploy-vm.sh                 # Master deployment script
├── VM_DEPLOYMENT_GUIDE.md      # Dokumentasi lengkap
├── README.md                   # File ini
├── scripts/                    # Deployment scripts
│   ├── install-dependencies.sh # Install Node.js, PostgreSQL, Nginx, etc.
│   ├── setup-database.sh      # Setup PostgreSQL database
│   ├── setup-environment.sh   # Setup environment variables
│   ├── setup-security.sh      # Configure firewall & security
│   ├── setup-nginx.sh         # Configure Nginx reverse proxy
│   ├── deploy-app.sh          # Deploy and start application
│   ├── health-monitor.sh      # Health monitoring script
│   └── collect-metrics.sh     # Metrics collection script
├── systemd/                    # Systemd service files
│   ├── trading-bot.service           # Main application service
│   ├── trading-bot-monitor.service   # Health monitoring service
│   ├── trading-bot-metrics.service   # Metrics collection service
│   └── trading-bot-metrics.timer     # Metrics collection timer
└── nginx/                      # Nginx configuration
    └── trading-bot.conf        # Nginx reverse proxy config
```

## 🚀 Quick Start

### One-Command Deployment

```bash
sudo bash deployment/deploy-vm.sh
```

This will automatically:
1. Install all dependencies
2. Setup database
3. Configure security
4. Setup environment
5. Configure Nginx
6. Deploy application
7. Start all services

### Manual Step-by-Step

```bash
# 1. Install dependencies
sudo bash deployment/scripts/install-dependencies.sh

# 2. Setup database
sudo bash deployment/scripts/setup-database.sh

# 3. Configure security
sudo bash deployment/scripts/setup-security.sh

# 4. Setup environment
sudo bash deployment/scripts/setup-environment.sh

# 5. Setup Nginx (optional)
sudo bash deployment/scripts/setup-nginx.sh

# 6. Deploy application
sudo bash deployment/scripts/deploy-app.sh
```

## 📋 Prerequisites

- Ubuntu 20.04 LTS or newer
- Root/sudo access
- 2GB+ RAM (4GB+ recommended)
- 20GB+ free disk space
- Internet connection

## 📚 Documentation

Lihat [VM_DEPLOYMENT_GUIDE.md](./VM_DEPLOYMENT_GUIDE.md) untuk:
- Detailed deployment instructions
- Post-deployment configuration
- Monitoring & maintenance
- Troubleshooting guide
- Security best practices

## 🔧 Scripts Description

### install-dependencies.sh
Menginstall semua dependencies yang diperlukan:
- Node.js 20.x LTS
- PostgreSQL 15
- Nginx
- PM2
- UFW Firewall
- fail2ban
- Basic utilities

### setup-database.sh
Setup PostgreSQL database:
- Create database `trading_bot`
- Create user dengan random password
- Configure PostgreSQL access
- Setup automated backups
- Save credentials ke `/root/.trading-bot-credentials`

### setup-security.sh
Configure security measures:
- UFW firewall rules
- fail2ban configuration
- Automatic security updates
- SSH hardening
- Kernel hardening
- Security monitoring

### setup-environment.sh
Setup environment:
- Create `.env.production` file
- Setup logging directories
- Configure log rotation
- Setup monitoring directories

### setup-nginx.sh
Configure Nginx:
- Install Nginx configuration
- Setup reverse proxy
- Configure rate limiting
- Add security headers
- Enable gzip compression

### deploy-app.sh
Deploy application:
- Install npm dependencies
- Setup Prisma
- Build Next.js application
- Install systemd services
- Start application
- Run health checks

### health-monitor.sh
Health monitoring (runs every minute via systemd):
- Check application health endpoint
- Monitor memory usage
- Monitor CPU usage
- Auto-restart if needed
- Send alerts (customizable)

### collect-metrics.sh
Metrics collection (runs every 5 minutes via systemd timer):
- Collect system metrics (CPU, RAM, disk)
- Collect application metrics
- Save to JSON files
- Auto-cleanup old metrics (30 days retention)

## 🔒 Security Features

1. **Firewall (UFW)**
   - SSH (22)
   - HTTP (80)
   - HTTPS (443)
   - Trading Bot (3000)
   - PostgreSQL (localhost only)

2. **fail2ban**
   - SSH protection
   - Nginx HTTP auth protection
   - DoS protection
   - Bad bots protection

3. **SSH Hardening**
   - Strong ciphers only
   - Limited authentication attempts
   - Connection timeout
   - Public key authentication ready

4. **Automatic Updates**
   - Security updates auto-installed
   - Kernel updates
   - Package updates

5. **Monitoring**
   - Health checks every minute
   - Metrics collection every 5 minutes
   - Security monitoring hourly
   - Automated backups daily

## 📊 Systemd Services

### trading-bot.service
Main application service:
- Auto-start on boot
- Auto-restart on failure
- Resource limits (2GB RAM, 200% CPU)
- Logging to `/var/log/trading-bot/`

### trading-bot-monitor.service
Health monitoring service:
- Runs health checks every minute
- Auto-restart application if unhealthy
- Monitor resource usage
- Alert on issues

### trading-bot-metrics.timer + trading-bot-metrics.service
Metrics collection:
- Collect system & application metrics
- Run every 5 minutes
- Store in JSON format
- Auto-cleanup after 30 days

## 🌐 Nginx Configuration

Nginx acts as reverse proxy with:
- Rate limiting (10 req/s)
- Connection limiting
- Gzip compression
- Security headers
- Static file caching
- WebSocket support
- SSL/TLS ready

## 📝 Logs

All logs are stored in `/var/log/trading-bot/`:
- `output.log` - Application output
- `error.log` - Application errors
- `health-monitor.log` - Health check logs
- `security-monitor.log` - Security events
- `metrics/` - Metrics JSON files

Log rotation configured:
- Daily rotation
- 14 days retention for logs
- 30 days retention for metrics
- Automatic compression

## 🔍 Monitoring

### View Logs
```bash
# Application logs
sudo journalctl -u trading-bot -f

# Health monitor
sudo journalctl -u trading-bot-monitor -f

# All logs
sudo tail -f /var/log/trading-bot/*.log
```

### Check Status
```bash
# Service status
sudo systemctl status trading-bot

# Health check
curl http://localhost:3000/api/health

# Metrics
curl http://localhost:3000/api/system-metrics
```

### View Metrics
```bash
# Today's metrics
sudo cat /var/log/trading-bot/metrics/metrics-$(date +%Y%m%d).json | jq

# Latest metrics
sudo tail -1 /var/log/trading-bot/metrics/metrics-$(date +%Y%m%d).json | jq
```

## 🆘 Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u trading-bot -n 100 --no-pager

# Check port
sudo lsof -i :3000

# Restart
sudo systemctl restart trading-bot
```

### Database issues
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
sudo cat /root/.trading-bot-credentials
# Use credentials to test connection
```

### Nginx issues
```bash
# Test config
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/trading-bot-error.log

# Restart
sudo systemctl restart nginx
```

## 📞 Support

For detailed help, see:
- [VM_DEPLOYMENT_GUIDE.md](./VM_DEPLOYMENT_GUIDE.md)
- [Project README](../README.md)
- [GitHub Issues](https://github.com/bagussundaru/NovemberAITrader/issues)

## 📄 License

Same as main project.

---

**Made with ❤️ for automated crypto trading**
