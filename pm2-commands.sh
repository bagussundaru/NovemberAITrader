#!/bin/bash

# PM2 Management Commands for Pramilupu Trading AI
# This script provides easy commands to manage the application

case "$1" in
  start)
    echo "🚀 Starting Pramilupu Trading AI..."
    pm2 start ecosystem.config.js
    ;;
  
  stop)
    echo "🛑 Stopping Pramilupu Trading AI..."
    pm2 stop pramilupu-trading-ai
    ;;
  
  restart)
    echo "🔄 Restarting Pramilupu Trading AI..."
    pm2 restart pramilupu-trading-ai
    ;;
  
  status)
    echo "📊 Status of Pramilupu Trading AI:"
    pm2 status pramilupu-trading-ai
    ;;
  
  logs)
    echo "📋 Showing logs (Ctrl+C to exit)..."
    pm2 logs pramilupu-trading-ai
    ;;
  
  logs-error)
    echo "❌ Showing error logs..."
    pm2 logs pramilupu-trading-ai --err
    ;;
  
  logs-out)
    echo "✅ Showing output logs..."
    pm2 logs pramilupu-trading-ai --out
    ;;
  
  monitor)
    echo "📈 Opening PM2 monitor..."
    pm2 monit
    ;;
  
  delete)
    echo "🗑️ Deleting Pramilupu Trading AI from PM2..."
    pm2 delete pramilupu-trading-ai
    ;;
  
  save)
    echo "💾 Saving PM2 process list..."
    pm2 save
    ;;
  
  info)
    echo "ℹ️ Detailed information:"
    pm2 info pramilupu-trading-ai
    ;;
  
  flush)
    echo "🧹 Flushing logs..."
    pm2 flush pramilupu-trading-ai
    ;;
  
  *)
    echo "🤖 Pramilupu Trading AI - PM2 Management"
    echo ""
    echo "Usage: ./pm2-commands.sh [command]"
    echo ""
    echo "Available commands:"
    echo "  start       - Start the application"
    echo "  stop        - Stop the application"
    echo "  restart     - Restart the application"
    echo "  status      - Show application status"
    echo "  logs        - Show all logs (live)"
    echo "  logs-error  - Show error logs only"
    echo "  logs-out    - Show output logs only"
    echo "  monitor     - Open PM2 monitor dashboard"
    echo "  delete      - Remove application from PM2"
    echo "  save        - Save current PM2 process list"
    echo "  info        - Show detailed information"
    echo "  flush       - Clear all logs"
    echo ""
    echo "Examples:"
    echo "  ./pm2-commands.sh start"
    echo "  ./pm2-commands.sh logs"
    echo "  ./pm2-commands.sh restart"
    ;;
esac
