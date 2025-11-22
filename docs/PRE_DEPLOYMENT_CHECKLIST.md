# Pre-Deployment Checklist

Before deploying the Live Trading Bot to your Ubuntu VM, ensure you have everything ready.

## Prerequisites Checklist

### ✅ Server Requirements

- [ ] Ubuntu 20.04 LTS or higher installed
- [ ] Minimum 4GB RAM (8GB recommended)
- [ ] Minimum 20GB disk space available
- [ ] Root or sudo access configured
- [ ] Stable internet connection
- [ ] Server is accessible via SSH

### ✅ Access Credentials

- [ ] SSH access to the server (username and password or key)
- [ ] Root password or sudo privileges
- [ ] Server IP address or hostname

### ✅ API Credentials

- [ ] **Nebius AI Platform**
  - [ ] Account created at Nebius AI
  - [ ] JWT token generated
  - [ ] API URL noted (default: https://api.studio.nebius.ai/v1)
  - [ ] Model name confirmed (default: meta-llama/Meta-Llama-3.1-8B-Instruct)

- [ ] **Binance Futures Testnet**
  - [ ] Testnet account created at https://testnet.binancefuture.com
  - [ ] API key generated
  - [ ] API secret saved securely
  - [ ] Testnet base URL noted (https://testnet.binancefuture.com)

### ✅ Domain and SSL (Optional but Recommended)

- [ ] Domain name registered (if using custom domain)
- [ ] DNS A record pointing to server IP
- [ ] SSL certificate ready or plan to use Let's Encrypt

### ✅ Local Preparation

- [ ] Repository cloned or downloaded locally
- [ ] Deployment scripts reviewed
- [ ] Documentation read (UBUNTU_VM_DEPLOYMENT.md)
- [ ] Backup plan for existing data (if any)

### ✅ Security Preparation

- [ ] SSH key pair generated (if not already)
- [ ] Strong passwords prepared for:
  - [ ] Application user account
  - [ ] Database user (auto-generated, but good to know)
- [ ] Firewall rules reviewed and understood
- [ ] Backup email address for notifications (optional)

### ✅ Configuration Values

Prepare these values before starting deployment:

| Item | Value | Notes |
|------|-------|-------|
| Server IP | _________________ | Your Ubuntu VM IP |
| SSH Port | 22 (default) | Change if custom |
| App User | tradingbot (default) | Or custom name |
| App Port | 3000 (default) | Or custom port |
| Nebius API URL | https://api.studio.nebius.ai/v1 | |
| Nebius JWT Token | _________________ | Keep secure! |
| Binance API Key | _________________ | Keep secure! |
| Binance Secret | _________________ | Keep secure! |
| Trading Pairs | BTCUSDT,ETHUSDT | Comma-separated |
| Max Position Size | 1000 | In USDT |
| Stop Loss % | 2 | Percentage |
| Default Leverage | 5 | 1-10x |
| Max Leverage | 10 | Maximum allowed |

## Pre-Deployment Steps

### 1. Test SSH Connection

```bash
ssh username@your-server-ip
```

Ensure you can connect successfully.

### 2. Check Server Resources

```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
lscpu
```

### 3. Update System (Recommended)

```bash
sudo apt update
sudo apt upgrade -y
```

### 4. Transfer Scripts to Server

**Option A: Clone Repository**
```bash
git clone https://github.com/yourusername/NovemberAITrader.git
cd NovemberAITrader
```

**Option B: Upload Scripts**
```bash
# From local machine
scp -r scripts/ username@your-server-ip:~/
scp -r docs/ username@your-server-ip:~/
```

### 5. Verify Scripts are Executable

```bash
chmod +x scripts/*.sh
ls -l scripts/
```

## Deployment Readiness Test

Run this quick test to ensure your server is ready:

```bash
# Check Ubuntu version
lsb_release -a

# Check available disk space (should be > 20GB)
df -h /

# Check available memory (should be > 4GB)
free -h

# Check internet connectivity
ping -c 3 google.com

# Check if ports are available
sudo lsof -i :3000
sudo lsof -i :5432
```

## Common Pre-Deployment Issues

### Issue: Insufficient Disk Space

**Solution:**
```bash
# Check disk usage
df -h

# Clean up if needed
sudo apt autoremove
sudo apt clean
```

### Issue: Insufficient Memory

**Solution:**
- Upgrade server to at least 4GB RAM
- Or create swap space:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Issue: Firewall Already Configured

**Solution:**
- Review existing rules: `sudo ufw status`
- Backup existing config: `sudo cp /etc/ufw/user.rules /etc/ufw/user.rules.backup`
- Proceed with deployment (script will add rules, not replace)

### Issue: PostgreSQL Already Installed

**Solution:**
- Check version: `psql --version`
- If version is 14+, skip installation step
- Manually run database setup script only

## Security Considerations

### Before Deployment

1. **Change Default SSH Port (Optional)**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Change Port 22 to custom port
   sudo systemctl restart sshd
   ```

2. **Disable Root Login (After creating app user)**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set: PermitRootLogin no
   sudo systemctl restart sshd
   ```

3. **Setup SSH Key Authentication**
   ```bash
   # On local machine
   ssh-keygen -t rsa -b 4096
   ssh-copy-id username@your-server-ip
   ```

### After Deployment

1. **Test SSH Key Login**
2. **Disable Password Authentication**
3. **Setup Monitoring Alerts**
4. **Configure Automated Backups**
5. **Setup SSL Certificate**

## Deployment Timeline

Estimated time for each step:

| Step | Duration | Notes |
|------|----------|-------|
| System Dependencies | 5-10 min | Depends on internet speed |
| Security Configuration | 5 min | Interactive prompts |
| Database Setup | 2-3 min | Automated |
| Application Setup | 5-10 min | Depends on npm install |
| Verification | 2 min | Automated checks |
| **Total** | **20-30 min** | First-time deployment |

## Final Checklist Before Starting

- [ ] All prerequisites met
- [ ] API credentials ready
- [ ] SSH access confirmed
- [ ] Server resources verified
- [ ] Scripts transferred to server
- [ ] Documentation reviewed
- [ ] Backup plan in place
- [ ] Time allocated (30-60 minutes)
- [ ] Ready to proceed!

## Quick Start Command

Once all prerequisites are met, start deployment with:

```bash
# On your Ubuntu VM
sudo bash scripts/deploy-all.sh
```

## Need Help?

- **Documentation:** `docs/UBUNTU_VM_DEPLOYMENT.md`
- **Quick Reference:** `docs/DEPLOYMENT_QUICK_REFERENCE.md`
- **Scripts Guide:** `scripts/README.md`
- **Verification:** `bash scripts/verify-deployment.sh`

## Emergency Contacts

Prepare these before deployment:

- [ ] System administrator contact
- [ ] Backup person who can access server
- [ ] API support contacts (Nebius, Binance)
- [ ] Hosting provider support

---

**Ready to deploy?** Proceed to `docs/UBUNTU_VM_DEPLOYMENT.md` for detailed instructions!
