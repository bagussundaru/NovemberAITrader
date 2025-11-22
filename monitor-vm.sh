#!/bin/bash

# VM Monitoring Script for AI Trading Dashboard
echo "=== AI Trading Dashboard VM Monitor ==="
echo "Timestamp: $(date)"
echo ""

# Memory Usage
echo "--- Memory Usage ---"
free -h | grep -E "(Mem|Swap)"
echo ""

# CPU Usage
echo "--- CPU Usage ---"
top -bn1 | grep "Cpu(s)"
echo ""

# Disk Usage
echo "--- Disk Usage ---"
df -h / | tail -1
echo ""

# Check if Next.js is running
echo "--- Application Status ---"
if pgrep -f "next dev" > /dev/null; then
    echo "✅ Next.js dev server is running"
    echo "PID: $(pgrep -f "next dev")"
else
    echo "❌ Next.js dev server is not running"
fi
echo ""

# Network ports
echo "--- Network Ports ---"
ss -tlnp | grep :3000 || echo "Port 3000: Not in use"
echo ""

# Memory usage by Node.js processes
echo "--- Node.js Memory Usage ---"
ps aux | grep -E "(node|next)" | grep -v grep | awk '{print $2, $3, $4, $11}' | head -5
echo ""

echo "=== End of Report ==="