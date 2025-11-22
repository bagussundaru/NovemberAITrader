# Deployment Scripts

This directory contains automated deployment scripts for setting up the Live Trading Bot on Ubuntu VM.

## Scripts Overview

### 1. `ubuntu-vm-setup.sh`
**Purpose:** Install all system dependencies  
**Run as:** Root (sudo)  
**What it does:**
- Installs Node.js 18+
- Installs PostgreSQL 14+
- Installs Docker and Docker Compose
- Installs Nginx web server

**Usage:**
```bash
sudo bash scripts/ubuntu-vm-setup.sh
```

### 2. `ubuntu-security-setup.sh`
**Purpose:** Configure system security  
**Run as:** Root (sudo)  
**What it does:**
- Configures UFW firewall
- Installs and configures fail2ban
- Hardens SSH configuration
- Creates non-root application user

**Usage:**
```bash
sudo bash scripts/ubuntu-security-setup.sh
```

**Important:** You'll be prompted to create an application user and set a password.

### 3. `ubuntu-database-setup.sh`
**Purpose:** Setup PostgreSQL database  
**Run as:** Root (sudo)  
**What it does:**
- Creates `trading_bot` database
- Creates `trading_user` with secure password
- Configures database permissions
- Sets up automated daily backups

**Usage:**
```bash
sudo bash scripts/ubuntu-database-setup.sh
```

**Important:** Save the database credentials displayed at the end!

### 4. `ubuntu-app-setup.sh`
**Purpose:** Setup the application  
**Run as:** Application user (NOT root)  
**What it does:**
- Clones repository (optional)
- Installs npm dependencies
- Configures environment variables
- Runs database migrations
- Builds the application
- Creates systemd service file

**Usage:**
```bash
# As application user
bash scripts/ubuntu-app-setup.sh

# Or from another user
su - tradingbot -c 'bash scripts/ubuntu-app-setup.sh'
```

### 5. `deploy-all.sh`
**Purpose:** Run all deployment steps in sequence  
**Run as:** Root (sudo)  
**What it does:**
- Runs steps 1-3 automatically
- Provides instructions for step 4

**Usage:**
```bash
sudo bash scripts/deploy-all.sh
```

### 6. `verify-deployment.sh`
**Purpose:** Verify deployment is complete and correct  
**Run as:** Any user  
**What it does:**
- Checks all dependencies are installed
- Verifies services are running
- Checks database configuration
- Validates application setup
- Reports errors and warnings

**Usage:**
```bash
bash scripts/verify-deployment.sh
```

## Deployment Workflow

### Quick Start (Automated)

```bash
# 1. Run master deployment script
sudo bash scripts/deploy-all.sh

# 2. Switch to application user and setup app
su - tradingbot
cd /path/to/NovemberAITrader
bash scripts/ubuntu-app-setup.sh

# 3. Verify deployment
bash scripts/verify-deployment.sh

# 4. Start the application
sudo systemctl start trading-bot
```

### Step-by-Step (Manual)

```bash
# Step 1: Install dependencies
sudo bash scripts/ubuntu-vm-setup.sh

# Step 2: Configure security
sudo bash scripts/ubuntu-security-setup.sh

# Step 3: Setup database
sudo bash scripts/ubuntu-database-setup.sh

# Step 4: Setup application (as app user)
su - tradingbot
bash scripts/ubuntu-app-setup.sh

# Step 5: Verify everything
bash scripts/verify-deployment.sh

# Step 6: Start the service
sudo systemctl start trading-bot
```

## Prerequisites

- Ubuntu 20.04 LTS or higher
- Root or sudo access
- Minimum 4GB RAM (8GB recommended)
- 20GB disk space
- Internet connection

## Post-Deployment

After running the deployment scripts:

1. **Start the application:**
   ```bash
   sudo systemctl start trading-bot
   ```

2. **Check status:**
   ```bash
   sudo systemctl status trading-bot
   ```

3. **View logs:**
   ```bash
   sudo journalctl -u trading-bot -f
   ```

4. **Access dashboard:**
   ```
   http://your-server-ip:3000
   ```

## Troubleshooting

### Script Fails with Permission Error
- Ensure you're running with correct user (root for steps 1-3, app user for step 4)
- Check script has execute permissions: `chmod +x scripts/*.sh`

### Database Connection Issues
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check credentials in `/root/.trading_bot_db_credentials`
- Test connection: `psql -U trading_user -d trading_bot -h localhost`

### Application Won't Start
- Check logs: `sudo journalctl -u trading-bot -n 50`
- Verify environment variables: `cat .env.production`
- Ensure application is built: `npm run build`

### Firewall Blocking Access
- Check firewall rules: `sudo ufw status`
- Allow application port: `sudo ufw allow 3000/tcp`

## Additional Resources

- **Full Documentation:** `../docs/UBUNTU_VM_DEPLOYMENT.md`
- **Database Credentials:** `/root/.trading_bot_db_credentials` (root only)
- **Deployment Summary:** `/root/trading-bot-deployment-summary.txt` (root only)
- **Application Logs:** `/var/log/trading-bot/` (if using systemd)
- **Database Backups:** `/var/backups/trading_bot/`

## Security Notes

1. **Save Credentials Securely:**
   - Database credentials are displayed once during setup
   - Also saved to `/root/.trading_bot_db_credentials`
   - Store in a secure password manager

2. **SSH Key Authentication:**
   - Add your SSH public key to `/home/tradingbot/.ssh/authorized_keys`
   - Test SSH login before disabling password authentication

3. **Firewall Configuration:**
   - Only necessary ports are opened (22, 80, 443, 3000)
   - Adjust as needed for your security requirements

4. **Regular Updates:**
   - Keep system updated: `sudo apt update && sudo apt upgrade`
   - Update application regularly: `git pull && npm install && npm run build`

## Support

For issues or questions:
1. Check the verification script output: `bash scripts/verify-deployment.sh`
2. Review logs: `sudo journalctl -u trading-bot -f`
3. Consult full documentation: `docs/UBUNTU_VM_DEPLOYMENT.md`
