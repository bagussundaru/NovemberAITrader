"use client";

interface SystemHealthProps {
  health: any;
}

export default function SystemHealth({ health }: SystemHealthProps) {
  const isHealthy = health?.status === 'healthy';
  const uptime = health?.uptime || 0;
  const uptimeMinutes = Math.floor(uptime / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeDays = Math.floor(uptimeHours / 24);

  const getUptimeString = () => {
    if (uptimeDays > 0) return `${uptimeDays}d ${uptimeHours % 24}h`;
    if (uptimeHours > 0) return `${uptimeHours}h ${uptimeMinutes % 60}m`;
    return `${uptimeMinutes}m`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🔧 System Health</h3>
        <div className={`status ${isHealthy ? 'status-active' : 'status-inactive'}`}>
          {isHealthy ? 'HEALTHY' : 'UNHEALTHY'}
        </div>
      </div>

      <div className="grid grid-2 md:grid-4" style={{ gap: 'var(--spacing-md)' }}>
        <div className="metric-card">
          <div className="metric-label">Status</div>
          <div className="metric-value" style={{ 
            color: isHealthy ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: 'var(--font-size-xl)'
          }}>
            {isHealthy ? '✅ OK' : '❌ ERROR'}
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Uptime</div>
          <div className="metric-value" style={{ fontSize: 'var(--font-size-xl)' }}>
            {getUptimeString()}
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Environment</div>
          <div className="metric-value" style={{ fontSize: 'var(--font-size-base)' }}>
            {health?.environment || 'N/A'}
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">Last Update</div>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Additional System Info */}
      {health && (
        <div style={{ 
          marginTop: 'var(--spacing-lg)',
          padding: 'var(--spacing-md)',
          background: 'var(--color-background-tertiary)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)'
        }}>
          <div className="grid grid-2 md:grid-3" style={{ gap: 'var(--spacing-md)' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Database:</span>{' '}
              <strong style={{ color: 'var(--color-success)' }}>Connected</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Bybit API:</span>{' '}
              <strong style={{ color: health?.services?.bybitExchange?.status === 'connected' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {health?.services?.bybitExchange?.status === 'connected' ? 'Connected' : 'Disconnected'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>AI Engine:</span>{' '}
              <strong style={{ color: health?.services?.nebiusAI?.status === 'connected' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {health?.services?.nebiusAI?.status === 'connected' ? 'Connected' : 'Disconnected'}
              </strong>
              {health?.services?.nebiusAI?.confidence && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  Confidence: {(health.services.nebiusAI.confidence * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
