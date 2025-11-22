"use client";

import { useState, useEffect } from 'react';

interface TradingExecutorPanelProps {
  balance: any;
}

export default function TradingExecutorPanel({ balance }: TradingExecutorPanelProps) {
  const [isActive, setIsActive] = useState(true);
  const [config, setConfig] = useState({
    riskPerTrade: 2.0,
    minConfidence: 60,
    maxPositions: 5,
    maxLeverage: 10,
    stopLoss: 5.0,
    takeProfit: 10.0
  });
  const [aiConfig, setAiConfig] = useState({
    model: 'deepseek-ai/DeepSeek-V3',
    confidenceThreshold: 0.7,
    signalProcessingInterval: 60,
    exchange: 'Bybit',
    tradingPair: 'ETHUSDT'
  });

  const activePositions = balance?.data?.positions?.length || 0;

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/trading/status', { cache: 'no-store' });
        const json = await res.json();
        const running = json?.data?.isRunning ?? false;
        if (mounted) setIsActive(running);
      } catch {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">🤖 AI Trading Executor</h3>
          <p className="card-subtitle">{aiConfig.exchange} + {aiConfig.model.split('/').pop()}</p>
        </div>
        <div className={`status ${isActive ? 'status-active' : 'status-inactive'}`}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-2 md:grid-3" style={{ gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <div className="metric-card">
          <div className="metric-label">Active Positions</div>
          <div className="metric-value">{activePositions}</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">AI Model</div>
          <div className="metric-value" style={{ fontSize: 'var(--font-size-sm)' }}>{aiConfig.model.split('/').pop()}</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Confidence Threshold</div>
          <div className="metric-value">{(aiConfig.confidenceThreshold * 100).toFixed(0)}%</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Risk Per Trade</div>
          <div className="metric-value">{config.riskPerTrade}%</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Signal Interval</div>
          <div className="metric-value">{aiConfig.signalProcessingInterval}s</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Exchange</div>
          <div className="metric-value">{aiConfig.exchange}</div>
        </div>
      </div>

      {/* Configuration Controls */}
      <div style={{ 
        background: 'var(--color-background-tertiary)',
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-md)' }}>
          Trading Configuration
        </h4>
        
        <div className="grid grid-1 md:grid-2" style={{ gap: 'var(--spacing-md)' }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              Risk Per Trade (%)
            </label>
            <input
              type="number"
              value={config.riskPerTrade}
              onChange={(e) => setConfig({...config, riskPerTrade: parseFloat(e.target.value)})}
              style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                background: 'var(--color-background)',
                border: '1px solid var(--color-neutral-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                fontSize: 'var(--font-size-sm)'
              }}
              step="0.1"
              min="0.1"
              max="10"
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              Min Confidence (%)
            </label>
            <input
              type="number"
              value={config.minConfidence}
              onChange={(e) => setConfig({...config, minConfidence: parseInt(e.target.value)})}
              style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                background: 'var(--color-background)',
                border: '1px solid var(--color-neutral-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                fontSize: 'var(--font-size-sm)'
              }}
              step="5"
              min="50"
              max="100"
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              Stop Loss (%)
            </label>
            <input
              type="number"
              value={config.stopLoss}
              onChange={(e) => setConfig({...config, stopLoss: parseFloat(e.target.value)})}
              style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                background: 'var(--color-background)',
                border: '1px solid var(--color-neutral-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                fontSize: 'var(--font-size-sm)'
              }}
              step="0.5"
              min="1"
              max="20"
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              Take Profit (%)
            </label>
            <input
              type="number"
              value={config.takeProfit}
              onChange={(e) => setConfig({...config, takeProfit: parseFloat(e.target.value)})}
              style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                background: 'var(--color-background)',
                border: '1px solid var(--color-neutral-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                fontSize: 'var(--font-size-sm)'
              }}
              step="0.5"
              min="2"
              max="50"
            />
          </div>
        </div>
      </div>

      {/* Control Buttons removed: trading autostart and runs automatically */}

      {/* Warning */}
      {isActive && (
        <div style={{
          marginTop: 'var(--spacing-lg)',
          padding: 'var(--spacing-md)',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-success)'
        }}>
          ✅ <strong>Bybit ETH/USDT Perpetual Trading</strong> - Powered by AI Engine (DeepSeek-V3 via Nebius)
        </div>
      )}
    </div>
  );
}
