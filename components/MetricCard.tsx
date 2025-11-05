"use client";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  gradient?: 'blue' | 'teal' | 'copper' | 'green' | 'red';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children?: React.ReactNode;
}

export default function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  gradient = 'blue',
  size = 'md',
  loading = false,
  children
}: MetricCardProps) {
  const gradientClasses = {
    blue: 'from-blue-500/20 to-blue-600/10',
    teal: 'from-teal-500/20 to-teal-600/10',
    copper: 'from-orange-500/20 to-orange-600/10',
    green: 'from-green-500/20 to-green-600/10',
    red: 'from-red-500/20 to-red-600/10'
  };

  const iconColors = {
    blue: 'text-blue-400',
    teal: 'text-teal-400',
    copper: 'text-orange-400',
    green: 'text-green-400',
    red: 'text-red-400'
  };

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const valueSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  if (loading) {
    return (
      <div className={`glass-card metric-card ${sizeClasses[size]} animate-pulse`}>
        <div className="flex items-start justify-between mb-4">
          <div className="w-24 h-4 bg-white/10 rounded loading-skeleton"></div>
          <div className="w-8 h-8 bg-white/10 rounded-lg loading-skeleton"></div>
        </div>
        <div className="w-32 h-8 bg-white/10 rounded loading-skeleton mb-2"></div>
        <div className="w-20 h-4 bg-white/10 rounded loading-skeleton"></div>
      </div>
    );
  }

  return (
    <div className={`glass-card metric-card ${sizeClasses[size]} animate-slide-up`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="metric-label text-gray-300">{title}</h3>
        </div>
        {icon && (
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradientClasses[gradient]}`}>
            <div className={iconColors[gradient]}>
              {icon}
            </div>
          </div>
        )}
      </div>

      {/* Value */}
      <div className={`metric-value ${valueSizes[size]} font-bold text-white mb-2`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {/* Change Indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-2">
          <div className={`metric-change ${change >= 0 ? 'positive' : 'negative'}`}>
            <div className="flex items-center gap-1">
              <svg 
                className={`w-3 h-3 ${change >= 0 ? 'rotate-0' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              {Math.abs(change).toFixed(2)}%
            </div>
          </div>
          {changeLabel && (
            <span className="text-xs text-gray-400">{changeLabel}</span>
          )}
        </div>
      )}

      {/* Additional Content */}
      {children && (
        <div className="mt-4 pt-4 border-t border-white/10">
          {children}
        </div>
      )}
    </div>
  );
}