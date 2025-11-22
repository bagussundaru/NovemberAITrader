"use client";

interface AccountSummaryProps {
  balance: any;
}

export default function AccountSummary({ balance }: AccountSummaryProps) {
  const data = balance?.data;
  const assets = data?.assets || [];
  const performance = data?.performance || {};

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">💰 Account Summary</h3>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Balance: Binance Futures Testnet
        </div>
      </div>

      {/* Main Balance Info */}
      <div className="grid grid-1 md:grid-3" style={{ gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ 
          background: 'var(--color-background-tertiary)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
            Available Balance
          </div>
          <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold', color: 'var(--color-success)' }}>
            ${data?.available?.toFixed(2) || '0.00'}
          </div>
        </div>
        
        <div style={{ 
          background: 'var(--color-background-tertiary)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
            Active Positions
          </div>
          <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold' }}>
            {data?.positions?.length || 0}
          </div>
        </div>
        
        <div style={{ 
          background: 'var(--color-background-tertiary)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
            Take Profit Target
          </div>
          <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold', color: 'var(--color-warning)' }}>
            $10.00
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
            Per Position: $10.00
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>
          Performance Metrics
        </h4>
        <div className="grid grid-2 md:grid-4" style={{ gap: 'var(--spacing-md)' }}>
          <div className="metric-card">
            <div className="metric-label">Total P&L</div>
            <div className="metric-value" style={{ 
              color: performance.totalPnL >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              ${performance.totalPnL >= 0 ? '+' : ''}{performance.totalPnL?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Win Rate</div>
            <div className="metric-value">
              {performance.winRate?.toFixed(1) || '0.0'}%
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Total Trades</div>
            <div className="metric-value">
              {performance.totalTrades || 0}
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">ROI</div>
            <div className="metric-value" style={{ 
              color: performance.roi >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              {performance.roi >= 0 ? '+' : ''}{performance.roi?.toFixed(2) || '0.00'}%
            </div>
          </div>
        </div>
      </div>

      {/* Assets Breakdown */}
      {assets.length > 0 && (
        <div>
          <h4 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>
            Assets Breakdown
          </h4>
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
                  <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-muted)' }}>Asset</th>
                  <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-muted)' }}>Wallet Balance</th>
                  <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-muted)' }}>Available</th>
                  <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-muted)' }}>Unrealized P&L</th>
                </tr>
              </thead>
              <tbody>
                {assets.slice(0, 5).map((asset: any, index: number) => (
                  <tr 
                    key={index}
                    style={{ borderBottom: '1px solid var(--color-neutral-light)' }}
                  >
                    <td style={{ padding: 'var(--spacing-sm)', fontWeight: 'bold' }}>
                      {asset.asset}
                    </td>
                    <td style={{ padding: 'var(--spacing-sm)' }}>
                      {parseFloat(asset.walletBalance || 0).toFixed(4)}
                    </td>
                    <td style={{ padding: 'var(--spacing-sm)' }}>
                      {parseFloat(asset.availableBalance || 0).toFixed(4)}
                    </td>
                    <td style={{ 
                      padding: 'var(--spacing-sm)',
                      color: parseFloat(asset.unrealizedProfit || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: '600'
                    }}>
                      {parseFloat(asset.unrealizedProfit || 0) >= 0 ? '+' : ''}
                      {parseFloat(asset.unrealizedProfit || 0).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
