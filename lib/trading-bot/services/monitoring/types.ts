// Monitoring and Notification Types

import { TradingPosition, TradeExecution, TradingSignal } from '../../types';

export interface PerformanceMetrics {
  totalTrades: number;
  profitLoss: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  uptime: number;
  averageTradeSize: number;
  totalVolume: number;
  successfulTrades: number;
  failedTrades: number;
  currentBalance: number;
  startingBalance: number;
  returnOnInvestment: number;
}

export interface TradingActivityLog {
  id: string;
  timestamp: Date;
  type: 'trade_executed' | 'signal_received' | 'position_opened' | 'position_closed' | 'error' | 'system_event';
  symbol?: string;
  action?: 'buy' | 'sell' | 'hold';
  amount?: number;
  price?: number;
  message: string;
  data?: any;
  severity: 'info' | 'warning' | 'error';
}

export interface SystemHealthStatus {
  isRunning: boolean;
  uptime: number;
  lastUpdate: Date;
  services: {
    nebiusAI: ServiceStatus;
    gateExchange: ServiceStatus;
    marketData: ServiceStatus;
    riskManagement: ServiceStatus;
  };
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  errorRate: number;
}

export interface ServiceStatus {
  isConnected: boolean;
  lastPing: Date;
  responseTime: number;
  errorCount: number;
  status: 'healthy' | 'degraded' | 'down';
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface NotificationConfig {
  enableRealTimeUpdates: boolean;
  enableTradeAlerts: boolean;
  enableErrorAlerts: boolean;
  enablePerformanceAlerts: boolean;
  alertThresholds: {
    dailyLossPercentage: number;
    errorRatePercentage: number;
    responseTimeMs: number;
  };
}

export interface DashboardData {
  accountBalance: {
    total: number;
    available: number;
    locked: number;
    currency: string;
    lastUpdate: Date;
  };
  positions: {
    open: TradingPosition[];
    totalValue: number;
    totalPnL: number;
    count: number;
  };
  performance: PerformanceMetrics;
  recentActivity: TradingActivityLog[];
  systemHealth: SystemHealthStatus;
}

export interface AlertMessage {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: any;
  acknowledged: boolean;
}

export interface RealTimeUpdate {
  type: 'balance_update' | 'position_update' | 'trade_executed' | 'system_alert' | 'performance_update';
  timestamp: Date;
  data: any;
}