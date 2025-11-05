"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/animated-number";
import { AlertTriangle, Play, Square, Zap, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface AccountBalance {
  total: number;
  available: number;
  locked: number;
  currency: string;
  lastUpdate: string;
}

interface TradingPosition {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  timestamp: string;
  status: 'open' | 'closed';
}

interface PerformanceMetrics {
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

interface TradingStatus {
  isRunning: boolean;
  startTime: string | null;
  totalTrades: number;
  activePositions: number;
  lastMarketUpdate: string | null;
  lastSignalProcessed: string | null;
}

interface DashboardData {
  accountBalance: AccountBalance;
  positions: {
    open: TradingPosition[];
    totalValue: number;
    totalPnL: number;
    count: number;
  };
  performance: PerformanceMetrics;
  recentActivity: any[];
  systemHealth: any;
}

export function TradingDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch("/api/trading/dashboard");
      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }, []);

  // Fetch trading status
  const fetchTradingStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/trading/status");
      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setTradingStatus(data.data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching trading status:", error);
      setLoading(false);
    }
  }, []);

  // Start trading
  const startTrading = async () => {
    setIsStarting(true);
    try {
      const response = await fetch("/api/trading/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tradingPairs: ["BTC/USDT", "ETH/USDT"],
          maxConcurrentTrades: 5,
          enableAutoTrading: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchTradingStatus();
        await fetchDashboardData();
      } else {
        console.error("Failed to start trading:", data.message);
      }
    } catch (error) {
      console.error("Error starting trading:", error);
    } finally {
      setIsStarting(false);
    }
  };

  // Stop trading
  const stopTrading = async () => {
    setIsStopping(true);
    try {
      const response = await fetch("/api/trading/stop", {
        method: "POST",
      });

      const data = await response.json();
      if (data.success) {
        await fetchTradingStatus();
        await fetchDashboardData();
      } else {
        console.error("Failed to stop trading:", data.message);
      }
    } catch (error) {
      console.error("Error stopping trading:", error);
    } finally {
      setIsStopping(false);
    }
  };

  // Emergency stop
  const emergencyStop = async () => {
    try {
      const response = await fetch("/api/trading/emergency-stop", {
        method: "POST",
      });

      const data = await response.json();
      if (data.success) {
        await fetchTradingStatus();
        await fetchDashboardData();
      } else {
        console.error("Failed to execute emergency stop:", data.message);
      }
    } catch (error) {
      console.error("Error executing emergency stop:", error);
    }
  };

  useEffect(() => {
    // Initial load
    fetchTradingStatus();
    fetchDashboardData();

    // Set up polling
    const statusInterval = setInterval(fetchTradingStatus, 5000);
    const dashboardInterval = setInterval(fetchDashboardData, 10000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(dashboardInterval);
    };
  }, [fetchTradingStatus, fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Live Trading Bot
              <span className="text-muted-foreground text-sm ml-2">
                AI-Powered Trading Dashboard
              </span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time trading performance and position monitoring
            </p>
          </div>
          {lastUpdate && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Last updated</div>
              <div className="text-lg font-mono">{lastUpdate}</div>
            </div>
          )}
        </div>

        {/* Trading Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Trading Controls
            </CardTitle>
            <CardDescription>
              Start, stop, or emergency halt trading operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    tradingStatus?.isRunning ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="font-medium">
                  Status: {tradingStatus?.isRunning ? "Running" : "Stopped"}
                </span>
              </div>
              
              <div className="flex gap-2 ml-auto">
                {!tradingStatus?.isRunning ? (
                  <Button
                    onClick={startTrading}
                    disabled={isStarting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isStarting ? "Starting..." : "Start Trading"}
                  </Button>
                ) : (
                  <Button
                    onClick={stopTrading}
                    disabled={isStopping}
                    variant="outline"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    {isStopping ? "Stopping..." : "Stop Trading"}
                  </Button>
                )}
                
                <Button
                  onClick={emergencyStop}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Emergency Stop
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber
                  value={dashboardData?.accountBalance.total.toFixed(2) || "0.00"}
                  className="font-mono"
                />
                <span className="text-sm text-muted-foreground ml-1">
                  {dashboardData?.accountBalance.currency || "USDT"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Available: {dashboardData?.accountBalance.available.toFixed(2) || "0.00"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.positions.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total Value: ${dashboardData?.positions.totalValue.toFixed(2) || "0.00"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
              {(dashboardData?.positions.totalPnL || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  (dashboardData?.positions.totalPnL || 0) >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                <AnimatedNumber
                  value={dashboardData?.positions.totalPnL.toFixed(2) || "0.00"}
                  className="font-mono"
                />
                <span className="text-sm text-muted-foreground ml-1">USDT</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {(dashboardData?.positions.totalPnL || 0) >= 0 ? "Profit" : "Loss"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.performance.totalTrades || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Success: {dashboardData?.performance.successfulTrades || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((dashboardData?.performance.winRate || 0) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Trading accuracy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  (dashboardData?.performance.profitLoss || 0) >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                <AnimatedNumber
                  value={dashboardData?.performance.profitLoss.toFixed(2) || "0.00"}
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ROI: {((dashboardData?.performance.returnOnInvestment || 0) * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor((dashboardData?.performance.uptime || 0) / 3600)}h
              </div>
              <p className="text-xs text-muted-foreground">
                System uptime
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Open Positions Table */}
        {dashboardData?.positions.open && dashboardData.positions.open.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>
                Current trading positions with real-time P&L
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Symbol</th>
                      <th className="text-left p-2">Side</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-right p-2">Entry Price</th>
                      <th className="text-right p-2">Current Price</th>
                      <th className="text-right p-2">P&L</th>
                      <th className="text-left p-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.positions.open.map((position) => (
                      <tr key={position.id} className="border-b">
                        <td className="p-2 font-medium">{position.symbol}</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              position.side === "buy"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {position.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono">
                          {position.amount.toFixed(6)}
                        </td>
                        <td className="p-2 text-right font-mono">
                          ${position.entryPrice.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-mono">
                          ${position.currentPrice.toFixed(2)}
                        </td>
                        <td
                          className={`p-2 text-right font-mono ${
                            position.unrealizedPnL >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          ${position.unrealizedPnL.toFixed(2)}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {new Date(position.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trading Status Details */}
        {tradingStatus && (
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Detailed trading system information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Start Time:</span>
                  <span className="ml-2 font-mono">
                    {tradingStatus.startTime
                      ? new Date(tradingStatus.startTime).toLocaleString()
                      : "Not started"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Trades:</span>
                  <span className="ml-2 font-mono">{tradingStatus.totalTrades}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Active Positions:</span>
                  <span className="ml-2 font-mono">{tradingStatus.activePositions}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Market Update:</span>
                  <span className="ml-2 font-mono">
                    {tradingStatus.lastMarketUpdate
                      ? new Date(tradingStatus.lastMarketUpdate).toLocaleString()
                      : "Never"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}