#!/bin/bash

###############################################################################
# Trading Bot VM Deployment - Security Setup Script
# Deskripsi: Konfigurasi firewall dan security measures
# Usage: sudo bash setup-security.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Trading Bot Security Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Configure UFW Firewall
echo -e "\n${YELLOW}[1/5] Configuring UFW Firewall...${NC}"

# Reset UFW to defaults
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# SSH - Allow from anywhere (consider restricting to specific IPs in production)
ufw allow 22/tcp comment 'SSH'

# HTTP/HTTPS - Allow from anywhere
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Trading Bot Application
ufw allow 3000/tcp comment 'Trading Bot Application'

# PostgreSQL - Only allow from localhost
ufw allow from 127.0.0.1 to any port 5432 proto tcp comment 'PostgreSQL local only'

# Enable firewall
ufw --force enable

echo -e "${GREEN}✓ UFW Firewall configured${NC}"
ufw status numbered

# Configure fail2ban
echo -e "\n${YELLOW}[2/5] Configuring fail2ban...${NC}"

# Create jail.local configuration
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
# Ban settings
bantime = 1h
findtime = 10m
maxretry = 5
destemail = root@localhost
sendername = Fail2Ban

# SSH protection
[sshd]
enabled = true
port = 22
logpath = %(sshd_log)s
backend = %(sshd_backend)s
maxretry = 5
bantime = 1h

# Nginx HTTP Auth
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

# Nginx DoS protection
[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 60
bantime = 300

# Nginx bad bots
[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

# Restart fail2ban
systemctl restart fail2ban
systemctl enable fail2ban

echo -e "${GREEN}✓ fail2ban configured${NC}"

# Setup automatic security updates
echo -e "\n${YELLOW}[3/5] Configuring automatic security updates...${NC}"

apt-get install -y unattended-upgrades apt-listchanges

cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}";
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

echo -e "${GREEN}✓ Automatic security updates configured${NC}"

# Secure SSH configuration
echo -e "\n${YELLOW}[4/5] Hardening SSH configuration...${NC}"

# Backup original SSH config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Update SSH configuration
cat > /etc/ssh/sshd_config.d/99-trading-bot-hardening.conf <<EOF
# Trading Bot SSH Hardening Configuration

# Disable root login (comment this out if you need root SSH access)
# PermitRootLogin no

# Disable password authentication (uncomment after setting up SSH keys)
# PasswordAuthentication no

# Enable public key authentication
PubkeyAuthentication yes

# Disable empty passwords
PermitEmptyPasswords no

# Disable X11 forwarding
X11Forwarding no

# Set max auth tries
MaxAuthTries 3

# Set login grace time
LoginGraceTime 60

# Set max sessions
MaxSessions 5

# Enable strict mode
StrictModes yes

# Disable host-based authentication
HostbasedAuthentication no
IgnoreRhosts yes

# Set allowed users (uncomment and customize)
# AllowUsers your-username

# Use only strong ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512

# Set client alive interval to detect broken connections
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# Test SSH configuration
sshd -t
if [ $? -eq 0 ]; then
    systemctl reload sshd
    echo -e "${GREEN}✓ SSH hardened${NC}"
else
    echo -e "${RED}✗ SSH configuration error - reverting changes${NC}"
    rm /etc/ssh/sshd_config.d/99-trading-bot-hardening.conf
fi

# Setup system limits
echo -e "\n${YELLOW}[5/5] Configuring system limits...${NC}"

cat > /etc/security/limits.d/99-trading-bot.conf <<EOF
# Trading Bot System Limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
root soft nofile 65536
root hard nofile 65536
root soft nproc 32768
root hard nproc 32768
EOF

# Kernel hardening
cat > /etc/sysctl.d/99-trading-bot-hardening.conf <<EOF
# Trading Bot Kernel Hardening

# IP Forwarding (disable if not needed)
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# Syncookies protection
net.ipv4.tcp_syncookies = 1

# Disable ICMP redirect acceptance
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Enable TCP/IP SYN cookies protection
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Log Martians (packets with impossible addresses)
net.ipv4.conf.all.log_martians = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Ignore ICMP ping requests
net.ipv4.icmp_echo_ignore_all = 0

# Ignore broadcast ICMP requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Enable bad error message protection
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Enable reverse path filtering
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Increase TCP buffer sizes
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864

# Connection tracking
net.netfilter.nf_conntrack_max = 1000000
net.netfilter.nf_conntrack_tcp_timeout_established = 600
EOF

# Apply sysctl settings
sysctl -p /etc/sysctl.d/99-trading-bot-hardening.conf

echo -e "${GREEN}✓ System limits configured${NC}"

# Create security monitoring script
cat > /usr/local/bin/security-monitor.sh <<'EOF'
#!/bin/bash
# Security monitoring script

LOG_FILE="/var/log/trading-bot/security-monitor.log"

echo "[$(date)] Security Monitor Check" >> "$LOG_FILE"

# Check for failed SSH attempts
FAILED_SSH=$(grep "Failed password" /var/log/auth.log | tail -5 | wc -l)
if [ "$FAILED_SSH" -gt 0 ]; then
    echo "  - Failed SSH attempts: $FAILED_SSH" >> "$LOG_FILE"
fi

# Check UFW status
UFW_STATUS=$(ufw status | grep "Status:" | awk '{print $2}')
echo "  - UFW Status: $UFW_STATUS" >> "$LOG_FILE"

# Check fail2ban banned IPs
BANNED_IPS=$(fail2ban-client status sshd | grep "Banned IP list:" | cut -d: -f2 | wc -w)
echo "  - Fail2ban banned IPs: $BANNED_IPS" >> "$LOG_FILE"

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "  - WARNING: Disk usage high: ${DISK_USAGE}%" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
EOF

chmod +x /usr/local/bin/security-monitor.sh

# Add to cron (run every hour)
(crontab -l 2>/dev/null; echo "0 * * * * /usr/local/bin/security-monitor.sh") | crontab -

echo -e "${GREEN}✓ Security monitoring configured${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Security Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\nSecurity measures configured:"
echo -e "  ✓ UFW Firewall enabled"
echo -e "  ✓ fail2ban configured"
echo -e "  ✓ Automatic security updates enabled"
echo -e "  ✓ SSH hardened"
echo -e "  ✓ System limits configured"
echo -e "  ✓ Kernel hardened"
echo -e "  ✓ Security monitoring enabled"

echo -e "\nActive firewall rules:"
ufw status numbered

echo -e "\n${YELLOW}Important Security Reminders:${NC}"
echo -e "  1. Change default SSH port (optional but recommended)"
echo -e "  2. Setup SSH key authentication and disable password auth"
echo -e "  3. Consider enabling root login protection"
echo -e "  4. Review and customize AllowUsers in SSH config"
echo -e "  5. Setup SSL/TLS certificates for HTTPS"
echo -e "  6. Regular security updates: apt update && apt upgrade"
echo -e "  7. Monitor logs: tail -f /var/log/trading-bot/security-monitor.log"

echo -e "\n${GREEN}Done!${NC}"
