"use client";

interface AIPerformancePanelProps {
  aiMetrics: any;
}

export default function AIPerformancePanel({ aiMetrics }: AIPerformancePanelProps) {
  if (!aiMetrics) {
    return (
      <div className="card">
        <h3 className="card-title">🧠 AI Performance</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading AI metrics...</p>
      </div>
    );
  }

  const successRate = aiMetrics.totalSignals > 0 ? (aiMetrics.successfulSignals / aiMetrics.totalSignals * 100) : 0;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">🧠 AI Performance Metrics</h3>
          <p className="card-subtitle">
            DeepSeek-V3 model performance and signal analysis
          </p>
        </div>
        <div className="status status-active">
          <span style={{ marginRight: 'var(--spacing-xs)' }}>●</span>
          Active
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-2 md:grid-4" style={{ gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <div className="metric-card" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
          <div className="metric-label">Total Signals</div>
          <div className="metric-value" style={{ color: '#3b82f6', fontSize: 'var(--font-size-2xl)' }}>
            {aiMetrics.totalSignals}
          </div>
        </div>
        
        <div className="metric-card" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
          <div className="metric-label">Success Rate</div>
          <div className="metric-value" style={{ color: '#10b981', fontSize: 'var(--font-size-2xl)' }}>
            {successRate.toFixed(1)}%
          </div>
        </div>
        
        <div className="metric-card" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
          <div className="metric-label">Avg Confidence</div>
          <div className="metric-value" style={{ color: '#f59e0b', fontSize: 'var(--font-size-2xl)' }}>
            {(aiMetrics.avgConfidence * 100).toFixed(1)}%
          </div>
        </div>
        
        <div className="metric-card" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
          <div className="metric-label">Model</div>
          <div className="metric-value" style={{ color: '#8b5cf6', fontSize: 'var(--font-size-sm)' }}>
            {aiMetrics.model?.split('/')?.pop() || 'DeepSeek-V3'}
          </div>
        </div>
      </div>

      {/* Signal Processing Info */}
      <div style={{ 
        background: 'var(--color-background-tertiary)', 
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <h4 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>
          ⚡ Signal Processing
        </h4>
        
        <div className="grid grid-2" style={{ gap: 'var(--spacing-md)' }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
              Last Signal
            </div>
            <div style={{ fontSize: 'var(--font-size-base)', fontWeight: '600' }}>
              {aiMetrics.lastSignalTime ? new Date(aiMetrics.lastSignalTime).toLocaleTimeString() : 'N/A'}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
              Processing Interval
            </div>
            <div style={{ fontSize: 'var(--font-size-base)', fontWeight: '600' }}>
              30 seconds
            </div>
          </div>
        </div>
      </div>

      {/* Model Information */}
      <div style={{ 
        background: 'rgba(59, 130, 246, 0.05)', 
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)' }}>
          🤖 AI Model Details
        </h4>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--line-height-relaxed)' }}>
          Using deepseek-ai/DeepSeek-V3-0324 for advanced market analysis and signal generation. 
          This model processes real-time market data to generate high-confidence trading signals 
          with automated risk management and position sizing.
        </p>
      </div>
    </div>
  );
}