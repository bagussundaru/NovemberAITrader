"use client";

import { useEffect, useState } from "react";
import Header from '@/components/dashboard/Header';
import Navigation from '@/components/dashboard/Navigation';
import PortfolioSummary from '@/components/dashboard/PortfolioSummary';
import MarketDataGrid from '@/components/dashboard/MarketDataGrid';
import AIAnalysisPanel from '@/components/dashboard/AIAnalysisPanel';
import ActivePositions from '@/components/dashboard/ActivePositions';
import NewsPanel from '@/components/dashboard/NewsPanel';
import TradingExecutorPanel from '@/components/dashboard/TradingExecutorPanel';
import WhaleDetectionPanel from '@/components/dashboard/WhaleDetectionPanel';
import AccountSummary from '@/components/dashboard/AccountSummary';
import SystemHealth from '@/components/dashboard/SystemHealth';
import ExchangeManagement from '@/components/dashboard/ExchangeManagement';
import AIPerformancePanel from '@/components/dashboard/AIPerformancePanel';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [news, setNews] = useState<any>(null);
  const [aiMetrics, setAiMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    
    // Set a simple timeout to show the dashboard
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Fetch data after component is mounted
  useEffect(() => {
    if (!mounted) return;

    const fetchData = async () => {
      try {
        console.log("Starting to fetch data...");
        const lightMode = process.env.NEXT_PUBLIC_LIGHT_MODE === 'true';
        const healthRes = await fetch("/api/health");
        const healthData = await healthRes.json();
        console.log("Health data fetched:", healthData);
        setHealth(healthData);

        const pricingRes = await fetch("/api/pricing");
        const pricingData = await pricingRes.json();
        console.log("Pricing data fetched:", pricingData);
        setPricing(pricingData);

        const balanceRes = await fetch("/api/trading/balance");
        const balanceData = await balanceRes.json();
        console.log("Balance data fetched:", balanceData);
        setBalance(balanceData);
        
        if (!lightMode) {
          const aiRes = await fetch("/api/ai/analysis");
          const aiData = await aiRes.json();
          console.log("AI data fetched:", aiData);
          setAiAnalysis(aiData);

          const newsRes = await fetch("/api/news");
          const newsData = await newsRes.json();
          console.log("News data fetched:", newsData);
          setNews(newsData);
        }

        console.log("All data fetched successfully");
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    // Fetch data after a short delay
    const fetchTimer = setTimeout(fetchData, 3000);
    
    const autostart = async () => {
      try {
        const lightMode = process.env.NEXT_PUBLIC_LIGHT_MODE === 'true';
        await fetch('/api/trading/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tradingPairs: lightMode ? ['BTC/USDT'] : ['BTC/USDT','ETH/USDT','SOL/USDT'],
            maxConcurrentTrades: lightMode ? 3 : 8,
            enableAutoTrading: true,
            credentials: {
              bybit: {
                baseUrl: process.env.NEXT_PUBLIC_BYBIT_BASE_URL || undefined,
                apiKey: process.env.NEXT_PUBLIC_BYBIT_API_KEY || undefined,
                apiSecret: process.env.NEXT_PUBLIC_BYBIT_API_SECRET || undefined,
                testnet: process.env.NEXT_PUBLIC_BYBIT_TESTNET === 'true'
              },
              nebius: {
                apiUrl: process.env.NEXT_PUBLIC_NEBIUS_API_URL || undefined,
                jwtToken: process.env.NEXT_PUBLIC_NEBIUS_JWT_TOKEN || undefined,
                model: process.env.NEXT_PUBLIC_NEBIUS_MODEL || undefined
              }
            }
          })
        });
      } catch (e) {
        console.error('Autostart trading failed', e);
      }
    };
    autostart();

    // Set up interval for periodic updates
    const pollEnv = Number(process.env.NEXT_PUBLIC_DASHBOARD_POLL_INTERVAL_MS || (process.env.NEXT_PUBLIC_LIGHT_MODE === 'true' ? 60000 : 20000));
    const interval = setInterval(fetchData, Math.max(10000, pollEnv));

    const sse = new EventSource('/api/trading/dashboard?stream=1');
    sse.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        const data = payload?.data;
        if (data) {
          setBalance({ success: true, data: data.accountBalance });
          setHealth({ success: true, data: data.systemHealth });
          setAiMetrics(data.aiMetrics);
        }
      } catch {}
    };
    sse.onerror = () => { sse.close(); };
    
    return () => {
      clearTimeout(fetchTimer);
      clearInterval(interval);
      sse.close();
    };
  }, [mounted]);

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <h1>🚀 Loading AI Trading System...</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Please wait while we initialize the dashboard...</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ 
      padding: 'var(--spacing-xl)', 
      minHeight: '100vh',
      maxWidth: '1600px'
    }}>
      <Header />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'exchanges' ? (
        <ExchangeManagement />
      ) : activeTab === 'settings' ? (
        <div className="card">
          <h2>⚙️ Settings</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Settings panel will be here.</p>
        </div>
      ) : (
        <div>
          {/* HERO SECTION - Portfolio Summary */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <PortfolioSummary balance={balance} />
          </div>

          {/* SECTION 1: System Status (2 columns on desktop) */}
          <div className="grid grid-1 md:grid-2" style={{ gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
            <SystemHealth health={health} />
            <AccountSummary balance={balance} />
          </div>

          {/* SECTION 2: Market Overview */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <MarketDataGrid pricing={pricing} />
          </div>

          {/* SECTION 3: AI Intelligence */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <AIAnalysisPanel aiAnalysis={aiAnalysis} />
          </div>

          {/* SECTION 3.5: AI Performance Metrics */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <AIPerformancePanel aiMetrics={aiMetrics} />
          </div>

          {/* SECTION 4: Trading Controls (2 columns on desktop) */}
          <div className="grid grid-1 lg:grid-2" style={{ gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
            <TradingExecutorPanel balance={balance} />
            <WhaleDetectionPanel symbol="BTCUSDT" />
          </div>

          {/* SECTION 5: Positions & Activity */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <ActivePositions balance={balance} />
          </div>

          {/* SECTION 6: Market Intelligence */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <NewsPanel news={news} />
          </div>

          {/* Footer */}
          <div className="card" style={{ 
            marginTop: 'var(--spacing-2xl)', 
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Pramilupu Trading AI</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
              Powered by AI Agent & Real-time Market Analysis
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Dashboard loaded at: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}