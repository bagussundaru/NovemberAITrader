# Deployment Quick Reference Card

## One-Command Deployment

```bash
# Run as root
sudo bash scripts/deploy-all.sh

# Then as application user
su - tradingbot
cd ~/NovemberAITrader
bash scripts/ubuntu-app-setup.sh
```

## Individual Steps

| Step | Command | Run As |
|------|---------|--------|
| 1. Install Dependencies | `sudo bash scripts/ubuntu-vm-setup.sh` | root |
| 2. Configure Security | `sudo bash scripts/ubuntu-security-setup.sh` | root |
| 3. Setup Database | `sudo bash scripts/ubuntu-database-setup.sh` | root |
| 4. Setup Application | `bash scripts/ubuntu-app-setup.sh` | app user |
| 5. Verify Deployment | `bash scripts/verify-deployment.sh` | any |

## Service Management

```bash
# Start
sudo systemctl start trading-bot

# Stop
sudo systemctl stop trading-bot

# Restart
sudo systemctl restart trading-bot

# Status
sudo systemctl status trading-bot

# Enable auto-start
sudo systemctl enable trading-bot

# Disable auto-start
sudo systemctl disable trading-bot
```

## Logs

```bash
# View live logs
sudo journalctl -u trading-bot -f

# View last 50 lines
sudo journalctl -u trading-bot -n 50

# View logs from today
sudo journalctl -u trading-bot --since today

# View logs from last hour
sudo journalctl -u trading-bot --since "1 hour ago"
```

## Database Operations

```bash
# Connect to database
psql -U trading_user -d trading_bot -h localhost

# Manual backup
sudo /usr/local/bin/backup-trading-db.sh

# List backups
ls -lh /var/backups/trading_bot/

# Restore from backup
gunzip -c /var/backups/trading_bot/backup_file.sql.gz | sudo -u postgres psql trading_bot
```

## Application Management

```bash
# Update application
cd ~/NovemberAITrader
git pull
npm install
npm run build
sudo systemctl restart trading-bot

# View environment
cat ~/NovemberAITrader/.env.production

# Run migrations
cd ~/NovemberAITrader
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## Firewall Management

```bash
# Check status
sudo ufw status verbose

# Allow port
sudo ufw allow 3000/tcp

# Deny port
sudo ufw deny 3000/tcp

# Delete rule
sudo ufw delete allow 3000/tcp

# Enable firewall
sudo ufw enable

# Disable firewall
sudo ufw disable
```

## fail2ban Management

```bash
# Check status
sudo fail2ban-client status

# Check SSH jail
sudo fail2ban-client status sshd

# Unban IP
sudo fail2ban-client set sshd unbanip 192.168.1.100

# Restart fail2ban
sudo systemctl restart fail2ban
```

## System Monitoring

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU and processes
htop

# Check network connections
netstat -tuln
# or
ss -tuln

# Check listening ports
sudo lsof -i -P -n | grep LISTEN
```

## Docker Operations (if using Docker)

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Rebuild and start
docker compose up -d --build

# Check status
docker compose ps
```

## Nginx Operations

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

## PostgreSQL Operations

```bash
# Check status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Connect as postgres user
sudo -u postgres psql

# List databases
sudo -u postgres psql -l

# List users
sudo -u postgres psql -c "\du"

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

## Troubleshooting Commands

```bash
# Check if port is in use
sudo lsof -i :3000

# Kill process on port
sudo kill -9 $(sudo lsof -t -i:3000)

# Check Node.js processes
ps aux | grep node

# Check system resources
top
htop

# Check disk I/O
iostat

# Check network connectivity
ping google.com
curl -I https://api.binance.com

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check DNS resolution
nslookup api.binance.com
```

## Important File Locations

| Item | Location |
|------|----------|
| Application Directory | `~/NovemberAITrader` |
| Environment Config | `~/NovemberAITrader/.env.production` |
| Database Credentials | `/root/.trading_bot_db_credentials` |
| Systemd Service | `/etc/systemd/system/trading-bot.service` |
| Application Logs | `/var/log/trading-bot/` |
| Database Backups | `/var/backups/trading_bot/` |
| Nginx Config | `/etc/nginx/sites-available/trading-bot` |
| PostgreSQL Config | `/etc/postgresql/*/main/` |
| Firewall Rules | `/etc/ufw/` |
| fail2ban Config | `/etc/fail2ban/jail.local` |

## Emergency Procedures

### Emergency Stop Trading

```bash
# Stop the service immediately
sudo systemctl stop trading-bot

# Or kill the process
sudo pkill -f "node.*next"
```

### Restore from Backup

```bash
# 1. Stop the application
sudo systemctl stop trading-bot

# 2. Restore database
gunzip -c /var/backups/trading_bot/latest_backup.sql.gz | sudo -u postgres psql trading_bot

# 3. Restart application
sudo systemctl start trading-bot
```

### Reset Application

```bash
# 1. Stop service
sudo systemctl stop trading-bot

# 2. Clean build
cd ~/NovemberAITrader
rm -rf .next node_modules

# 3. Reinstall and rebuild
npm install
npm run build

# 4. Restart service
sudo systemctl start trading-bot
```

## Access URLs

| Service | URL |
|---------|-----|
| Application | `http://your-server-ip:3000` |
| With Nginx | `http://your-domain.com` |
| With SSL | `https://your-domain.com` |

## Default Ports

| Service | Port |
|---------|------|
| SSH | 22 |
| HTTP | 80 |
| HTTPS | 443 |
| Application | 3000 |
| PostgreSQL | 5432 |

## Security Checklist

- [ ] Firewall enabled and configured
- [ ] fail2ban installed and running
- [ ] SSH key-based authentication configured
- [ ] Strong passwords set for all users
- [ ] Database credentials secured
- [ ] SSL/TLS configured (production)
- [ ] Regular backups enabled
- [ ] System updates scheduled
- [ ] Monitoring alerts configured
- [ ] API keys rotated regularly

## Performance Optimization

```bash
# Enable PostgreSQL connection pooling
# Add to DATABASE_URL: ?connection_limit=10

# Increase Node.js memory
# In systemd service:
Environment=NODE_OPTIONS="--max-old-space-size=4096"

# Enable Nginx caching
# Add to Nginx config:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;
```

## Useful Aliases (Add to ~/.bashrc)

```bash
alias tbot-start='sudo systemctl start trading-bot'
alias tbot-stop='sudo systemctl stop trading-bot'
alias tbot-restart='sudo systemctl restart trading-bot'
alias tbot-status='sudo systemctl status trading-bot'
alias tbot-logs='sudo journalctl -u trading-bot -f'
alias tbot-backup='sudo /usr/local/bin/backup-trading-db.sh'
```

## Support Resources

- **Full Documentation:** `docs/UBUNTU_VM_DEPLOYMENT.md`
- **Scripts README:** `scripts/README.md`
- **Verify Deployment:** `bash scripts/verify-deployment.sh`
- **View Logs:** `sudo journalctl -u trading-bot -f`
