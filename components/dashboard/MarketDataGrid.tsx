"use client";

interface MarketDataGridProps {
  pricing: any;
}

export default function MarketDataGrid({ pricing }: MarketDataGridProps) {
  if (!pricing || !pricing.success || !pricing.data) {
    return (
      <div className="card">
        <h3 className="card-title">📊 Live Market Data</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading market data...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📊 Live Market Data</h3>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Binance Futures Testnet
        </div>
      </div>
      
      <div className="grid grid-2 md:grid-3 lg:grid-5" style={{ gap: 'var(--spacing-md)' }}>
        {Object.entries(pricing.data).slice(0, 5).map(([symbol, data]: [string, any]) => (
          <div 
            key={symbol}
            className="metric-card"
            style={{ 
              background: 'var(--color-background-tertiary)',
              border: '1px solid var(--color-neutral-medium)',
              transition: 'all var(--transition-normal)'
            }}
          >
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'bold', 
              marginBottom: 'var(--spacing-sm)',
              color: 'var(--color-text)'
            }}>
              {symbol.replace('USDT', '/USDT')}
            </div>
            
            <div style={{ 
              fontSize: 'var(--font-size-xl)', 
              fontWeight: 'bold',
              marginBottom: 'var(--spacing-xs)'
            }}>
              ${typeof data.price === 'number' ? data.price.toLocaleString() : data.price}
            </div>
            
            <div style={{ 
              fontSize: 'var(--font-size-sm)',
              color: data.change24h >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
              fontWeight: '600'
            }}>
              {data.change24h >= 0 ? '+' : ''}{data.change24h?.toFixed(2)}%
            </div>
            
            <div style={{ 
              fontSize: 'var(--font-size-xs)', 
              color: 'var(--color-text-muted)',
              marginTop: 'var(--spacing-xs)'
            }}>
              Vol: {data.volume24h ? (data.volume24h / 1000000).toFixed(1) + 'M' : 'N/A'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
