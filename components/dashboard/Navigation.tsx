"use client";

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', badge: 'LIVE' },
    { id: 'exchanges', label: '🔑 Exchange Management' },
    { id: 'market', label: '📈 Market' },
    { id: 'ai', label: '🤖 AI Engine', badge: 'ACTIVE' },
    { id: 'settings', label: '⚙️ Pengaturan' }
  ];

  return (
    <nav className="card mb-lg" style={{ padding: 'var(--spacing-md)' }}>
      <div className="flex" style={{ gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'btn btn-primary' : 'btn'}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              background: activeTab === tab.id 
                ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' 
                : 'var(--color-background-tertiary)',
              color: 'white',
              border: 'none',
              position: 'relative'
            }}
          >
            {tab.label}
            {tab.badge && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: 'var(--color-success)',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 'bold'
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
