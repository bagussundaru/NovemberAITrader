"use client";

import { useState } from 'react';

export default function ExchangeManagement() {
  const [exchanges] = useState([
    {
      name: 'Binance Futures',
      type: 'Testnet',
      status: 'connected',
      apiKey: 'test_***************',
      balance: 693.86,
      positions: 2
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="card mb-lg">
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-xs)' }}>
              🔑 Exchange Management
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              Manage your exchange connections and API keys
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            ➕ Add Exchange
          </button>
        </div>
      </div>

      {/* Add Exchange Form */}
      {showAddForm && (
        <div className="card mb-lg">
          <h3 className="card-title">Add New Exchange</h3>
          <div className="grid grid-1 md:grid-2" style={{ gap: 'var(--spacing-md)' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-xs)'
              }}>
                Exchange
              </label>
              <select style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                background: 'var(--color-background-tertiary)',
                border: '1px solid var(--color-neutral-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                fontSize: 'var(--font-size-sm)'
              }}>
                <option>Binance Futures</option>
                <option>Binance Spot</option>
                <option>Bybit</option>
                <option>OKX</option>
              </select>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-xs)'
              }}>
                Environment
              </label>
              <select style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                background: 'var(--color-background-tertiary)',
                border: '1px solid var(--color-neutral-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                fontSize: 'var(--font-size-sm)'
              }}>
                <option>Testnet</option>
                <option>Production</option>
              </select>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-xs)'
              }}>
                API Key
              </label>
              <input
                type="text"
                placeholder="Enter API Key"
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-neutral-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--font-size-sm)'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-xs)'
              }}>
                API Secret
              </label>
              <input
                type="password"
                placeholder="Enter API Secret"
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-neutral-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--font-size-sm)'
                }}
              />
            </div>
          </div>
          
          <div className="flex" style={{ gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
            <button className="btn btn-success">
              ✅ Test Connection
            </button>
            <button className="btn btn-primary">
              💾 Save Exchange
            </button>
            <button 
              className="btn"
              style={{ background: 'var(--color-background-tertiary)' }}
              onClick={() => setShowAddForm(false)}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Connected Exchanges */}
      <div className="card">
        <h3 className="card-title">Connected Exchanges</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {exchanges.map((exchange, index) => (
            <div 
              key={index}
              style={{ 
                background: 'var(--color-background-tertiary)',
                padding: 'var(--spacing-xl)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-neutral-medium)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <div>
                  <h4 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-xs)' }}>
                    {exchange.name}
                  </h4>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <div className="status status-active">
                      <span style={{ marginRight: 'var(--spacing-xs)' }}>●</span>
                      {exchange.status.toUpperCase()}
                    </div>
                    <div className="status status-warning">
                      {exchange.type}
                    </div>
                  </div>
                </div>
                
                <div className="flex" style={{ gap: 'var(--spacing-sm)' }}>
                  <button 
                    className="btn"
                    style={{ 
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      background: 'var(--color-background)'
                    }}
                  >
                    ⚙️ Settings
                  </button>
                  <button 
                    className="btn btn-danger"
                    style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
              
              <div className="grid grid-2 md:grid-4" style={{ gap: 'var(--spacing-md)' }}>
                <div className="metric-card">
                  <div className="metric-label">API Key</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', fontFamily: 'monospace' }}>
                    {exchange.apiKey}
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-label">Balance</div>
                  <div className="metric-value" style={{ fontSize: 'var(--font-size-xl)' }}>
                    ${exchange.balance.toFixed(2)}
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-label">Active Positions</div>
                  <div className="metric-value" style={{ fontSize: 'var(--font-size-xl)' }}>
                    {exchange.positions}
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-label">Last Sync</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              <div style={{ 
                marginTop: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-success)'
              }}>
                ✅ Connection healthy - Last checked: {new Date().toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Permissions Info */}
      <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
        <h3 className="card-title">⚠️ Required API Permissions</h3>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            For the trading bot to function properly, your API keys must have the following permissions:
          </p>
          <ul style={{ paddingLeft: 'var(--spacing-xl)', lineHeight: 'var(--line-height-relaxed)' }}>
            <li>✅ <strong>Read</strong> - View account balance and positions</li>
            <li>✅ <strong>Trade</strong> - Place and cancel orders</li>
            <li>❌ <strong>Withdraw</strong> - NOT required (keep disabled for security)</li>
          </ul>
          <div style={{ 
            marginTop: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)'
          }}>
            🔒 <strong>Security Note:</strong> Never share your API keys. Store them securely and enable IP whitelist if possible.
          </div>
        </div>
      </div>
    </div>
  );
}
