"use client";

interface PortfolioSummaryProps {
  balance: any;
}

export default function PortfolioSummary({ balance }: PortfolioSummaryProps) {
  const totalBalance = balance?.data?.total || 0;
  const unrealizedPnL = balance?.data?.performance?.totalPnL || 0;
  const activePositions = balance?.data?.positions?.length || 0;
  const aiSignals = balance?.data?.aiSignals || 0;
  const aiWinRate = balance?.data?.aiWinRate || 0;
  const avgConfidence = balance?.data?.avgConfidence || 0;

  return (
    <div className="card card-hero">
      <div className="card-header" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
        <div>
          <h3 className="card-title">💰 Total Portfolio</h3>
          <p className="card-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Last Sync: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="status" style={{ 
          background: 'rgba(16, 185, 129, 0.3)', 
          color: 'white',
          border: '1px solid rgba(255,255,255,0.3)'
        }}>
          HEALTHY
        </div>
      </div>
      
      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <div style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 'bold', marginBottom: 'var(--spacing-sm)' }}>
          ${totalBalance.toFixed(2)}
        </div>
        <div style={{ 
          fontSize: 'var(--font-size-xl)', 
          color: unrealizedPnL >= 0 ? '#10b981' : '#ef4444',
          marginBottom: 'var(--spacing-md)'
        }}>
          ${unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)} Unrealized P&L
        </div>
        
        <div className="grid grid-3" style={{ gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--spacing-xs)' }}>
              Available Balance
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>
              ${balance?.data?.available?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--spacing-xs)' }}>
              Active Positions
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>
              {activePositions}
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--spacing-xs)' }}>
              AI Win Rate
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>
              {aiWinRate.toFixed(1)}%
            </div>
          </div>
        </div>
        
        {/* AI Performance Metrics */}
        <div className="grid grid-2" style={{ gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--spacing-xs)' }}>
              AI Signals Processed
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: '#3b82f6' }}>
              {aiSignals}
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--spacing-xs)' }}>
              Avg AI Confidence
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: '#10b981' }}>
              {avgConfidence.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
