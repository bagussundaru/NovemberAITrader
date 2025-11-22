"use client";

interface ActivePositionsProps {
  balance: any;
}

export default function ActivePositions({ balance }: ActivePositionsProps) {
  const positions = balance?.data?.positions || [];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📈 Active Positions</h3>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Current trading positions with real-time P&L
        </div>
      </div>

      {positions.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--spacing-2xl)',
          color: 'var(--color-text-muted)'
        }}>
          <div style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--spacing-md)' }}>
            📊
          </div>
          <p>No active positions</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: 'var(--font-size-sm)'
          }}>
            <thead>
              <tr style={{ 
                borderBottom: '1px solid var(--color-neutral-medium)',
                textAlign: 'left'
              }}>
                <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Symbol</th>
                <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Side</th>
                <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Size</th>
                <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Entry Price</th>
                <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Mark Price</th>
                <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Unrealized P&L</th>
                <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>AI Confidence</th>
                <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>AI Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position: any, index: number) => {
                const pnl = parseFloat(position.unrealizedProfit || 0);
                const pnlPercent = position.entryPrice 
                  ? ((parseFloat(position.markPrice) - parseFloat(position.entryPrice)) / parseFloat(position.entryPrice) * 100)
                  : 0;
                
                return (
                  <tr 
                    key={index}
                    style={{ 
                      borderBottom: '1px solid var(--color-neutral-light)',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-neutral-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: 'var(--spacing-md)', fontWeight: 'bold' }}>
                      {position.symbol}
                    </td>
                    <td style={{ padding: 'var(--spacing-md)' }}>
                      <span className={`status ${
                        position.positionAmt > 0 ? 'status-active' : 'status-inactive'
                      }`} style={{ fontSize: 'var(--font-size-xs)' }}>
                        {position.positionAmt > 0 ? 'LONG' : 'SHORT'}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--spacing-md)' }}>
                      {Math.abs(parseFloat(position.positionAmt || 0)).toFixed(3)}
                    </td>
                    <td style={{ padding: 'var(--spacing-md)' }}>
                      ${parseFloat(position.entryPrice || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: 'var(--spacing-md)' }}>
                      ${parseFloat(position.markPrice || 0).toFixed(2)}
                    </td>
                    <td style={{ 
                      padding: 'var(--spacing-md)',
                      color: pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: 'bold'
                    }}>
                      ${pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                      <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>
                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                      </div>
                    </td>
                    <td style={{ padding: 'var(--spacing-md)' }}>
                      <div style={{ 
                        fontSize: 'var(--font-size-sm)', 
                        fontWeight: 'bold',
                        color: position.aiConfidence >= 0.7 ? 'var(--color-success)' : 
                               position.aiConfidence >= 0.5 ? 'var(--color-warning)' : 'var(--color-danger)'
                      }}>
                        {(position.aiConfidence * 100 || 0).toFixed(1)}%
                      </div>
                    </td>
                    <td style={{ 
                      padding: 'var(--spacing-md)',
                      fontSize: 'var(--font-size-xs)',
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {position.aiReasoning || 'AI analysis pending'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
