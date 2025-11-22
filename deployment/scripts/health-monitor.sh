#!/bin/bash

###############################################################################
# Trading Bot Health Monitor Script
# Deskripsi: Monitor kesehatan trading bot dan restart jika diperlukan
# Usage: Dijalankan otomatis oleh systemd
###############################################################################

# Configuration
HEALTH_ENDPOINT="http://localhost:3000/api/health"
MAX_RETRIES=3
RETRY_DELAY=5
LOG_FILE="/var/log/trading-bot/health-monitor.log"

# Create log directory if not exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check health
check_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$HEALTH_ENDPOINT")
    echo "$response"
}

# Function to restart service
restart_service() {
    log "WARNING: Restarting trading-bot service..."
    systemctl restart trading-bot
    sleep 10
    log "Service restarted"
}

# Function to send alert (placeholder - implement your notification method)
send_alert() {
    local message="$1"
    log "ALERT: $message"
    # Add your alert logic here (email, Slack, Telegram, etc.)
}

# Main health check loop
log "Starting health check..."

for i in $(seq 1 $MAX_RETRIES); do
    HTTP_CODE=$(check_health)

    if [ "$HTTP_CODE" == "200" ]; then
        log "✓ Health check passed (HTTP $HTTP_CODE)"

        # Additional checks
        # Check memory usage
        MEMORY_USAGE=$(ps aux | grep "npm start" | grep -v grep | awk '{print $4}' | head -1)
        if [ ! -z "$MEMORY_USAGE" ]; then
            MEMORY_INT=$(printf "%.0f" "$MEMORY_USAGE")
            if [ "$MEMORY_INT" -gt 80 ]; then
                send_alert "High memory usage: ${MEMORY_USAGE}%"
            fi
        fi

        # Check CPU usage
        CPU_USAGE=$(ps aux | grep "npm start" | grep -v grep | awk '{print $3}' | head -1)
        if [ ! -z "$CPU_USAGE" ]; then
            CPU_INT=$(printf "%.0f" "$CPU_USAGE")
            if [ "$CPU_INT" -gt 90 ]; then
                send_alert "High CPU usage: ${CPU_USAGE}%"
            fi
        fi

        exit 0
    else
        log "✗ Health check failed (HTTP $HTTP_CODE) - Attempt $i/$MAX_RETRIES"

        if [ $i -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    fi
done

# All retries failed
log "ERROR: Health check failed after $MAX_RETRIES attempts"
send_alert "Trading bot health check failed after $MAX_RETRIES attempts"

# Check if service is running
if systemctl is-active --quiet trading-bot; then
    log "Service is running but not responding - attempting restart"
    restart_service
else
    log "Service is not running - attempting start"
    systemctl start trading-bot
    sleep 10
fi

# Final check after restart
HTTP_CODE=$(check_health)
if [ "$HTTP_CODE" == "200" ]; then
    log "✓ Service recovered successfully"
    send_alert "Trading bot recovered after restart"
else
    log "✗ Service failed to recover"
    send_alert "CRITICAL: Trading bot failed to recover after restart"
fi

exit 0
