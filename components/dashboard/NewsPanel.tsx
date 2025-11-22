"use client";

interface NewsPanelProps {
  news: any;
}

export default function NewsPanel({ news }: NewsPanelProps) {
  const newsItems = news?.data?.news || [];

  const getImpactColor = (impact: string) => {
    switch (impact?.toUpperCase()) {
      case 'HIGH': return 'var(--color-danger)';
      case 'MEDIUM': return 'var(--color-warning)';
      case 'LOW': return 'var(--color-success)';
      default: return 'var(--color-text-muted)';
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📰 Market News</h3>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Latest crypto updates
        </div>
      </div>

      {newsItems.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--spacing-2xl)',
          color: 'var(--color-text-muted)'
        }}>
          <p>Loading news...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {newsItems.slice(0, 4).map((item: any, index: number) => (
            <div 
              key={index}
              style={{ 
                padding: 'var(--spacing-lg)',
                background: 'var(--color-background-tertiary)',
                borderRadius: 'var(--radius-lg)',
                borderLeft: `4px solid ${getImpactColor(item.impact)}`,
                transition: 'all var(--transition-normal)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: 'var(--spacing-sm)'
              }}>
                <div className="status" style={{ 
                  background: `${getImpactColor(item.impact)}20`,
                  color: getImpactColor(item.impact),
                  border: `1px solid ${getImpactColor(item.impact)}40`,
                  fontSize: 'var(--font-size-xs)'
                }}>
                  {item.impact || 'MEDIUM'}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {new Date(item.publishedAt).toLocaleTimeString()}
                </div>
              </div>
              
              <h4 style={{ 
                fontSize: 'var(--font-size-base)', 
                fontWeight: '600',
                marginBottom: 'var(--spacing-sm)',
                lineHeight: 'var(--line-height-tight)'
              }}>
                {item.title}
              </h4>
              
              <p style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--color-text-secondary)',
                lineHeight: 'var(--line-height-relaxed)',
                marginBottom: 'var(--spacing-sm)'
              }}>
                {item.description}
              </p>
              
              <div style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-text-muted)',
                fontWeight: '500'
              }}>
                {item.source}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ 
        marginTop: 'var(--spacing-lg)',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: 'var(--font-size-xs)', 
          color: 'var(--color-text-muted)',
          padding: 'var(--spacing-md)',
          background: 'var(--color-background-tertiary)',
          borderRadius: 'var(--radius-md)'
        }}>
          Pricing: Binance Futures Testnet • News: {news?.data?.source || 'Mock Data'}
        </div>
      </div>
    </div>
  );
}
