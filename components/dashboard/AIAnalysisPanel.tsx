"use client";

interface AIAnalysisPanelProps {
  aiAnalysis: any;
}

export default function AIAnalysisPanel({ aiAnalysis }: AIAnalysisPanelProps) {
  if (!aiAnalysis || !aiAnalysis.success) {
    return (
      <div className="card">
        <h3 className="card-title">🤖 Nebius AI Market Analysis</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading AI analysis...</p>
      </div>
    );
  }

  const data = aiAnalysis.data;
  const analyses = data?.analyses || [];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">🤖 Nebius AI Market Analysis</h3>
          <p className="card-subtitle">
            Real-time market sentiment and trading signals powered by DeepSeek-V3
          </p>
        </div>
        <div className="flex" style={{ gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <div className="status status-active">
            <span style={{ marginRight: 'var(--spacing-xs)' }}>●</span>
            Connected
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Updated: {new Date(data?.timestamp || Date.now()).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Market Sentiment Summary */}
      <div style={{ 
        background: 'var(--color-background-tertiary)', 
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <h4 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>
          🎯 Market Sentiment Analysis
        </h4>
        
        <div style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'bold',
          marginBottom: 'var(--spacing-sm)'
        }}>
          {data?.marketSentiment || 'NEUTRAL'}
        </div>
        
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
          AI Model: <strong>deepseek-ai/DeepSeek-V3-0324</strong>
        </div>
        
        <div className="grid grid-3" style={{ gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
          <div className="metric-card" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <div className="metric-value" style={{ color: 'var(--color-success)' }}>
              {data?.buySignals || 0}
            </div>
            <div className="metric-label">BUY Signals</div>
          </div>
          
          <div className="metric-card" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <div className="metric-value" style={{ color: 'var(--color-danger)' }}>
              {data?.sellSignals || 0}
            </div>
            <div className="metric-label">SELL Signals</div>
          </div>
          
          <div className="metric-card" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <div className="metric-value" style={{ color: 'var(--color-warning)' }}>
              {data?.holdSignals || 0}
            </div>
            <div className="metric-label">HOLD Signals</div>
          </div>
        </div>
      </div>

      {/* Individual Analysis Cards */}
      <div className="grid grid-1 md:grid-2 lg:grid-3" style={{ gap: 'var(--spacing-md)' }}>
        {analyses.slice(0, 6).map((analysis: any, index: number) => (
          <div 
            key={index}
            className="card-feature"
            style={{ 
              background: 'var(--color-background-tertiary)',
              padding: 'var(--spacing-lg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-neutral-medium)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 'var(--spacing-md)'
            }}>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>
                {analysis.symbol}
              </div>
              <div className={`status ${
                analysis.action === 'BUY' ? 'status-active' : 
                analysis.action === 'SELL' ? 'status-inactive' : 
                'status-warning'
              }`}>
                {analysis.action}
              </div>
            </div>
            
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <div style={{ 
                fontSize: 'var(--font-size-2xl)', 
                fontWeight: 'bold',
                marginBottom: 'var(--spacing-xs)'
              }}>
                {(analysis.confidence * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                Confidence
              </div>
            </div>
            
            <div className="grid grid-2" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  RSI
                </div>
                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: '600' }}>
                  {analysis.technicalIndicators?.rsi?.toFixed(1) || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  Trend
                </div>
                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: '600' }}>
                  {analysis.technicalIndicators?.trend || 'NEUTRAL'}
                </div>
              </div>
            </div>
            
            <div style={{ 
              fontSize: 'var(--font-size-xs)', 
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              {analysis.modelUsed?.replace('Nebius', 'AI Agent') || 'AI Agent'}
            </div>
            
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--line-height-relaxed)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical'
            }}>
              {analysis.reasoning || 'No reasoning provided'}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{ 
        marginTop: 'var(--spacing-xl)',
        padding: 'var(--spacing-lg)',
        background: 'var(--color-background-tertiary)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: 'var(--spacing-md)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
            Average Confidence
          </div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>
            {analyses.length > 0 
              ? (analyses.reduce((sum: number, a: any) => sum + (a.confidence || 0), 0) / analyses.length * 100).toFixed(1)
              : '0.0'}%
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
            Analysis Coverage
          </div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>
            {analyses.length} symbols analyzed
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
            Top Symbols
          </div>
          <div style={{ fontSize: 'var(--font-size-base)', fontWeight: '600' }}>
            {analyses.slice(0, 3).map((a: any) => a.symbol.replace('USDT', '')).join(', ')}
          </div>
        </div>
      </div>
    </div>
  );
}
