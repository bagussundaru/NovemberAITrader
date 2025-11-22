#!/bin/bash

# Ubuntu VM Security Configuration Script
# This script configures firewall, SSH, fail2ban, and creates application user
# Run with: sudo bash ubuntu-security-setup.sh

set -e  # Exit on error

echo "=========================================="
echo "Live Trading Bot - Security Configuration"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Install UFW (Uncomplicated Firewall)
echo "Step 1: Installing and configuring UFW firewall..."
apt-get install -y ufw

# Configure firewall rules
echo "Configuring firewall rules..."
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (port 22)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP (port 80) for Nginx
ufw allow 80/tcp comment 'HTTP'

# Allow HTTPS (port 443) for Nginx
ufw allow 443/tcp comment 'HTTPS'

# Allow application port (3000) - can be restricted to localhost if using Nginx proxy
ufw allow 3000/tcp comment 'Trading Bot Application'

# Allow PostgreSQL (5432) - only if remote access needed
# Uncomment the line below if you need remote database access
# ufw allow 5432/tcp comment 'PostgreSQL'

# Enable firewall
echo "y" | ufw enable

# Show firewall status
ufw status verbose

# Install and configure fail2ban
echo ""
echo "Step 2: Installing and configuring fail2ban..."
apt-get install -y fail2ban

# Create fail2ban configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban hosts for 1 hour
bantime = 3600

# Find time window (10 minutes)
findtime = 600

# Max retry attempts
maxretry = 5

# Email notifications (configure if needed)
# destemail = your-email@example.com
# sendername = Fail2Ban
# action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

# Start and enable fail2ban
systemctl start fail2ban
systemctl enable fail2ban

# Show fail2ban status
fail2ban-client status

# Configure SSH for key-based authentication
echo ""
echo "Step 3: Configuring SSH security..."

# Backup original SSH config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Update SSH configuration for better security
sed -i 's/#PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config

# Add additional security settings
cat >> /etc/ssh/sshd_config << 'EOF'

# Additional Security Settings
Protocol 2
MaxAuthTries 3
MaxSessions 2
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# Restart SSH service
systemctl restart sshd

echo ""
echo "SSH configuration updated. Root login via password is disabled."
echo "Make sure you have SSH keys configured before logging out!"

# Create non-root user for application
echo ""
echo "Step 4: Creating application user..."

# Prompt for username
read -p "Enter username for application user (default: tradingbot): " APP_USER
APP_USER=${APP_USER:-tradingbot}

# Check if user already exists
if id "$APP_USER" &>/dev/null; then
    echo "User $APP_USER already exists. Skipping user creation."
else
    # Create user with home directory
    useradd -m -s /bin/bash "$APP_USER"
    
    # Add user to docker group (so they can run docker commands)
    usermod -aG docker "$APP_USER"
    
    # Set password for user
    echo ""
    echo "Set password for user $APP_USER:"
    passwd "$APP_USER"
    
    # Create .ssh directory for the user
    mkdir -p /home/$APP_USER/.ssh
    chmod 700 /home/$APP_USER/.ssh
    touch /home/$APP_USER/.ssh/authorized_keys
    chmod 600 /home/$APP_USER/.ssh/authorized_keys
    chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh
    
    echo ""
    echo "User $APP_USER created successfully!"
    echo "To add SSH key for this user, add your public key to:"
    echo "  /home/$APP_USER/.ssh/authorized_keys"
fi

# Configure sudo access for application user (optional)
read -p "Grant sudo access to $APP_USER? (y/n): " GRANT_SUDO
if [ "$GRANT_SUDO" = "y" ] || [ "$GRANT_SUDO" = "Y" ]; then
    usermod -aG sudo "$APP_USER"
    echo "Sudo access granted to $APP_USER"
fi

echo ""
echo "=========================================="
echo "Security Configuration Complete!"
echo "=========================================="
echo ""
echo "Security measures implemented:"
echo "  ✓ UFW firewall configured and enabled"
echo "  ✓ fail2ban installed and configured"
echo "  ✓ SSH hardened (key-based auth recommended)"
echo "  ✓ Application user '$APP_USER' created"
echo ""
echo "Firewall rules:"
ufw status numbered
echo ""
echo "IMPORTANT: Before logging out, ensure you can SSH with key-based authentication!"
echo ""
echo "Next steps:"
echo "  1. Add your SSH public key to /home/$APP_USER/.ssh/authorized_keys"
echo "  2. Test SSH login with the new user"
echo "  3. Consider disabling password authentication in /etc/ssh/sshd_config"
echo "  4. Run database setup script: sudo bash scripts/ubuntu-database-setup.sh"
echo ""
