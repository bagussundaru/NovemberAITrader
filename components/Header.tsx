"use client";

interface HeaderProps {
  balance?: any;
  tradingEngine?: any;
}

export default function Header({ balance, tradingEngine }: HeaderProps) {
  return (
    <header className="header sticky top-0 z-40 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Quick Stats */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gradient-blue">
                ${balance?.data?.total?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Total Balance</div>
            </div>
            
            <div className="w-px h-8 bg-white/20"></div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                (balance?.data?.performance?.totalPnL || 0) >= 0 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                ${balance?.data?.performance?.totalPnL?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Unrealized P&L</div>
            </div>
            
            <div className="w-px h-8 bg-white/20"></div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gradient-copper">
                {tradingEngine?.data?.performance?.tradesCount || 0}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Total Trades</div>
            </div>
          </div>
        </div>

        {/* Trading Engine Status & Controls */}
        <div className="flex items-center gap-6">
          {/* Engine Status */}
          <div className="flex items-center gap-3">
            <div className={`status-indicator ${
              tradingEngine?.data?.status === 'ACTIVE' ? 'active' : 'inactive'
            }`}>
              <div className="status-dot"></div>
              <span>Engine {tradingEngine?.data?.status || 'INACTIVE'}</span>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium text-white">
                Win Rate: {tradingEngine?.data?.performance?.winRate?.toFixed(1) || '0.0'}%
              </div>
              <div className="text-xs text-gray-400">
                Active: {tradingEngine?.data?.performance?.activePositions || 0} positions
              </div>
            </div>
          </div>

          {/* Market Status */}
          <div className="flex items-center gap-3">
            <div className="status-indicator active">
              <div className="status-dot"></div>
              <span>Market Open</span>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium text-white">
                {new Date().toLocaleTimeString('en-US', { 
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="text-xs text-gray-400">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>

          {/* User Avatar */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-white">AI Trader</div>
              <div className="text-xs text-gray-400">Premium • Level 5</div>
            </div>
            
            <div className="relative">
              <div className="w-10 h-10 bg-teal-gradient rounded-full flex items-center justify-center ring-2 ring-blue-400/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 19H6.5A2.5 2.5 0 014 16.5v-9A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v3.5" />
            </svg>
            
            {/* Notification badge */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">3</span>
            </div>
          </button>

          {/* Settings */}
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Performance Bar */}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all duration-500"
            style={{ 
              width: `${Math.min(Math.max((tradingEngine?.data?.performance?.winRate || 0), 0), 100)}%` 
            }}
          ></div>
        </div>
        <div className="text-xs text-gray-400 min-w-0">
          Performance: {tradingEngine?.data?.performance?.winRate?.toFixed(1) || '0.0'}%
        </div>
      </div>
    </header>
  );
}