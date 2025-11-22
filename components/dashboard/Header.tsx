"use client";

export default function Header() {
  return (
    <header className="card mb-lg">
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-xs)' }}>
            PTPramilupu Trading AI
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Advanced Crypto Platform
          </p>
        </div>
        
        <div className="flex" style={{ gap: 'var(--spacing-md)', alignItems: 'center' }}>
          <div className="status status-active">
            <span style={{ marginRight: 'var(--spacing-xs)' }}>●</span>
            LIVE
          </div>
          
          <select 
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'var(--color-background-tertiary)',
              border: '1px solid var(--color-neutral-medium)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            <option>Binance Futures Testnet</option>
          </select>
          
          <button 
            className="btn btn-primary"
            style={{ padding: 'var(--spacing-sm) var(--spacing-lg)' }}
          >
            Mode: Dark
          </button>
        </div>
      </div>
    </header>
  );
}
