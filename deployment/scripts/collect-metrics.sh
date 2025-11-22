#!/bin/bash

###############################################################################
# Trading Bot Metrics Collection Script
# Deskripsi: Mengumpulkan dan menyimpan metrics dari trading bot
# Usage: Dijalankan otomatis oleh systemd timer
###############################################################################

# Configuration
METRICS_DIR="/var/log/trading-bot/metrics"
METRICS_FILE="$METRICS_DIR/metrics-$(date +%Y%m%d).json"
API_ENDPOINT="http://localhost:3000/api/system-metrics"

# Create metrics directory if not exists
mkdir -p "$METRICS_DIR"

# Function to collect system metrics
collect_system_metrics() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

    # Memory usage
    local mem_total=$(free -m | awk 'NR==2{print $2}')
    local mem_used=$(free -m | awk 'NR==2{print $3}')
    local mem_percent=$(awk "BEGIN {printf \"%.2f\", ($mem_used/$mem_total)*100}")

    # Disk usage
    local disk_usage=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')

    # Network connections
    local connections=$(netstat -an | grep ESTABLISHED | wc -l)

    # Process count for trading bot
    local process_count=$(ps aux | grep -E "(npm|node)" | grep -v grep | wc -l)

    # Create JSON
    cat <<EOF
{
  "timestamp": "$timestamp",
  "system": {
    "cpu_usage": $cpu_usage,
    "memory": {
      "total_mb": $mem_total,
      "used_mb": $mem_used,
      "percent": $mem_percent
    },
    "disk_usage_percent": $disk_usage,
    "network_connections": $connections,
    "process_count": $process_count
  }
}
EOF
}

# Function to collect trading bot metrics from API
collect_api_metrics() {
    local response=$(curl -s --connect-timeout 5 --max-time 10 "$API_ENDPOINT")
    echo "$response"
}

# Collect metrics
SYSTEM_METRICS=$(collect_system_metrics)
API_METRICS=$(collect_api_metrics)

# Combine metrics
COMBINED_METRICS=$(jq -s '.[0] * {trading_bot: .[1]}' <(echo "$SYSTEM_METRICS") <(echo "$API_METRICS") 2>/dev/null || echo "$SYSTEM_METRICS")

# Save to file
echo "$COMBINED_METRICS" >> "$METRICS_FILE"

# Keep only last 30 days of metrics
find "$METRICS_DIR" -name "metrics-*.json" -mtime +30 -delete

# Log collection
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Metrics collected and saved to $METRICS_FILE"

exit 0
