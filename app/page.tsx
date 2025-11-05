"use client";

import { useEffect, useState } from "react";
import ExchangeManager from "@/components/exchange-manager";

export default function Home() {
  const [health, setHealth] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [tradingEngine, setTradingEngine] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleEngineControl = async (action: string) => {
    try {
      const response = await fetch("/api/trading/engine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();
      
      if (result.success) {
        const engineRes = await fetch("/api/trading/engine");
        const engineData = await engineRes.json();
        setTradingEngine(engineData);
        
        console.log(`Trading engine ${action}ed successfully`);
      } else {
        console.error(`Failed to ${action} trading engine:`, result.error);
      }
    } catch (error) {
      console.error(`Error ${action}ing trading engine:`, error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthRes, pricingRes, balanceRes, engineRes, aiRes, newsRes] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/pricing"),
          fetch("/api/trading/balance"),
          fetch("/api/trading/engine"),
          fetch("/api/ai/analysis"),
          fetch("/api/news")
        ]);

        const [healthData, pricingData, balanceData, engineData, aiData, newsData] = await Promise.all([
          healthRes.json(),
          pricingRes.json(),
          balanceRes.json(),
          engineRes.json(),
          aiRes.json(),
          newsRes.json()
        ]);

        setHealth(healthData);
        setPricing(pricingData);
        setBalance(balanceData);
        setTradingEngine(engineData);
        setAiAnalysis(aiData);
        setNews(newsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <h2>Initializing AI Trading System</h2>
        <p className="text-muted">Connecting to markets and analyzing data...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-xl)' }}>
      
      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--spacing-md)', 
        marginBottom: 'var(--spacing-xl)',
        borderBottom: '1px solid var(--color-neutral-medium)',
        paddingBottom: 'var(--spacing-md)'
      }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'dashboard' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setActiveTab('exchanges')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'exchanges' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🔑 Exchange Management
        </button>
      </div>

      {activeTab === 'exchanges' ? (
        <ExchangeManager />
      ) : (
        <>
          {/* Hero Section - Full Width */}
      <div className="card card-hero mb-xl col-span-12">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-lg)' }}>
          <div>
            <h1 style={{ color: 'white', marginBottom: 'var(--spacing-sm)' }}>Pramilupu Trading AI</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'var(--font-size-lg)' }}>
              Advanced Cryptocurrency Trading Platform
            </p>
            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700' }}>
                  ${balance?.data?.total?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>Total Portfolio</div>
              </div>
              <div>
                <div style={{ 
                  fontSize: 'var(--font-size-2xl)', 
                  fontWeight: '700',
                  color: (balance?.data?.performance?.totalPnL || 0) >= 0 ? '#10b981' : '#ef4444'
                }}>
                  ${balance?.data?.performance?.totalPnL?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>Unrealized P&L</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className={`status ${health?.status === 'healthy' ? 'status-active' : 'status-inactive'}`} style={{ marginBottom: 'var(--spacing-md)' }}>
              {health?.status?.toUpperCase() || 'UNKNOWN'}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>
              Last Update: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid md:grid-dashboard lg:grid-dashboard xl:grid-dashboard">
        
        {/* AI Analysis - Large Feature Card */}
        <div className="card card-feature col-span-12 md:col-span-8 lg:col-span-8">
          <div className="card-header">
            <div>
              <h3 className="card-title">🤖 Nebius AI Market Analysis</h3>
              <div className="card-subtitle">Real-time market sentiment and trading signals powered by Nebius AI</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: (aiAnalysis?.data?.nebiusAIStatus || aiAnalysis?.data?.summary?.nebiusAIStatus) === 'Connected' ? 'var(--color-success)' : 'var(--color-danger)', 
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }}></div>
              <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                {(aiAnalysis?.data?.nebiusAIStatus || aiAnalysis?.data?.summary?.nebiusAIStatus) === 'Connected' ? 'NEBIUS AI ACTIVE' : 'FALLBACK MODE'}
              </span>
            </div>
          </div>
          
          {aiAnalysis && aiAnalysis.success && (aiAnalysis.data?.summary || aiAnalysis.data) ? (
            <div>
              {/* Nebius AI Status */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <span className={`status ${
                    (aiAnalysis.data?.nebiusAIStatus || aiAnalysis.data?.summary?.nebiusAIStatus) === 'Connected' ? 'status-active' : 'status-inactive'
                  }`}>
                    {aiAnalysis.data?.nebiusAIStatus || aiAnalysis.data?.summary?.nebiusAIStatus || 'Unknown'}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>Nebius AI</span>
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {(aiAnalysis.data?.timestamp || aiAnalysis.data?.summary?.lastAnalysisTime) && 
                    `Updated: ${new Date(aiAnalysis.data?.timestamp || aiAnalysis.data?.summary?.lastAnalysisTime).toLocaleTimeString()}`
                  }
                </div>
              </div>

              {/* Market Sentiment from Nebius AI */}
              {(aiAnalysis.data?.marketSentiment || aiAnalysis.data?.summary?.marketSentiment) && (
                <div style={{ 
                  padding: 'var(--spacing-lg)', 
                  backgroundColor: 'var(--color-neutral-light)', 
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-neutral-medium)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div className="font-semibold mb-sm" style={{ 
                    fontSize: 'var(--font-size-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)'
                  }}>
                    🎯 Market Sentiment Analysis
                  </div>
                  <div style={{ 
                    fontSize: 'var(--font-size-base)', 
                    lineHeight: 'var(--line-height-relaxed)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    {aiAnalysis.data?.marketSentiment || aiAnalysis.data?.summary?.marketSentiment}
                  </div>
                </div>
              )}

              {/* Trading Signals */}
              <div className="grid grid-3 mb-lg">
                <div className="metric-card" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  <div className="metric-value text-success">
                    {aiAnalysis.data?.buySignals || aiAnalysis.data?.summary?.buySignals || 0}
                  </div>
                  <div className="metric-label">BUY Signals</div>
                </div>
                <div className="metric-card" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <div className="metric-value text-danger">
                    {aiAnalysis.data?.sellSignals || aiAnalysis.data?.summary?.sellSignals || 0}
                  </div>
                  <div className="metric-label">SELL Signals</div>
                </div>
                <div className="metric-card" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                  <div className="metric-value text-warning">
                    {aiAnalysis.data?.holdSignals || aiAnalysis.data?.summary?.holdSignals || 0}
                  </div>
                  <div className="metric-label">HOLD Signals</div>
                </div>
              </div>

              {/* Best Trading Opportunity from Nebius AI */}
              {(aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity) && (
                <div style={{ 
                  padding: 'var(--spacing-lg)', 
                  backgroundColor: (aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.action === 'BUY' ? 'rgba(16, 185, 129, 0.1)' : 
                                   (aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.action === 'SELL' ? 'rgba(239, 68, 68, 0.1)' : 
                                   'rgba(245, 158, 11, 0.1)',
                  borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${(aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.action === 'BUY' ? 'rgba(16, 185, 129, 0.3)' : 
                                      (aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.action === 'SELL' ? 'rgba(239, 68, 68, 0.3)' : 
                                      'rgba(245, 158, 11, 0.3)'}`,
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    <div className="font-semibold" style={{ fontSize: 'var(--font-size-lg)' }}>
                      🎯 Best Opportunity: {(aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.symbol}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      <span className={`status ${
                        (aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.action === 'BUY' ? 'status-active' : 
                        (aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.action === 'SELL' ? 'status-inactive' : 'status-warning'
                      }`}>
                        {(aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.action}
                      </span>
                      <span className="font-bold" style={{ 
                        fontSize: 'var(--font-size-xl)',
                        color: (aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.action === 'BUY' ? 'var(--color-success)' : 
                               (aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.action === 'SELL' ? 'var(--color-danger)' : 'var(--color-warning)'
                      }}>
                        {((aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: 'var(--font-size-base)', 
                    lineHeight: 'var(--line-height-relaxed)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--spacing-sm)'
                  }}>
                    {(aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.reasoning}
                  </div>
                  {(aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.modelUsed && (
                    <div style={{ 
                      fontSize: 'var(--font-size-xs)', 
                      color: 'var(--color-text-muted)',
                      fontStyle: 'italic'
                    }}>
                      Powered by: {(aiAnalysis.data?.bestOpportunity || aiAnalysis.data?.summary?.bestOpportunity)?.modelUsed}
                    </div>
                  )}
                </div>
              )}
              
              {/* Individual Analysis Results */}
              {(aiAnalysis.data?.analyses || aiAnalysis.data?.latestAnalyses) && (aiAnalysis.data?.analyses || aiAnalysis.data?.latestAnalyses).length > 0 && (
                <div style={{ 
                  padding: 'var(--spacing-lg)', 
                  backgroundColor: 'var(--color-neutral-light)', 
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-neutral-medium)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div className="font-semibold mb-lg" style={{ fontSize: 'var(--font-size-lg)' }}>
                    🔍 Individual Analysis Results
                  </div>
                  <div className="grid md:grid-2 lg:grid-3" style={{ gap: 'var(--spacing-md)' }}>
                    {(aiAnalysis.data?.analyses || aiAnalysis.data?.latestAnalyses).slice(0, 6).map((analysis: any, index: number) => (
                      <div key={index} style={{ 
                        padding: 'var(--spacing-md)', 
                        backgroundColor: 'var(--color-background)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-neutral-medium)'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: 'var(--spacing-sm)'
                        }}>
                          <div className="font-semibold" style={{ fontSize: 'var(--font-size-base)' }}>
                            {analysis.symbol}
                          </div>
                          <span className={`status ${
                            analysis.action === 'BUY' ? 'status-active' : 
                            analysis.action === 'SELL' ? 'status-inactive' : 'status-warning'
                          }`} style={{ fontSize: 'var(--font-size-xs)' }}>
                            {analysis.action}
                          </span>
                        </div>
                        
                        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                          <span className="font-semibold" style={{ 
                            color: analysis.action === 'BUY' ? 'var(--color-success)' : 
                                   analysis.action === 'SELL' ? 'var(--color-danger)' : 'var(--color-warning)',
                            fontSize: 'var(--font-size-lg)'
                          }}>
                            {(analysis.confidence * 100).toFixed(1)}%
                          </span>
                          <span className="text-muted ml-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
                            Confidence
                          </span>
                        </div>
                        
                        <div style={{ 
                          fontSize: 'var(--font-size-xs)', 
                          color: 'var(--color-text-muted)',
                          lineHeight: 'var(--line-height-normal)',
                          marginBottom: 'var(--spacing-sm)'
                        }}>
                          {analysis.reasoning?.substring(0, 100)}...
                        </div>
                        
                        {analysis.technicalIndicators && (
                          <div className="grid grid-2" style={{ gap: 'var(--spacing-xs)' }}>
                            <div style={{ 
                              textAlign: 'center',
                              padding: 'var(--spacing-xs)',
                              backgroundColor: 'var(--color-neutral-medium)',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600' }}>
                                {analysis.technicalIndicators.rsi?.toFixed(1) || 'N/A'}
                              </div>
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                RSI
                              </div>
                            </div>
                            <div style={{ 
                              textAlign: 'center',
                              padding: 'var(--spacing-xs)',
                              backgroundColor: 'var(--color-neutral-medium)',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              <div style={{ 
                                fontSize: 'var(--font-size-xs)', 
                                fontWeight: '600',
                                color: analysis.technicalIndicators.trend === 'BULLISH' ? 'var(--color-success)' :
                                       analysis.technicalIndicators.trend === 'BEARISH' ? 'var(--color-danger)' : 'var(--color-warning)'
                              }}>
                                {analysis.technicalIndicators.trend || 'NEUTRAL'}
                              </div>
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                Trend
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {analysis.modelUsed && (
                          <div style={{ 
                            fontSize: 'var(--font-size-xs)', 
                            color: 'var(--color-text-muted)',
                            marginTop: 'var(--spacing-sm)',
                            fontStyle: 'italic'
                          }}>
                            {analysis.modelUsed.replace('Nebius-', '')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Overall Analysis Summary */}
              <div style={{ 
                padding: 'var(--spacing-lg)', 
                backgroundColor: 'var(--color-neutral-light)', 
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-neutral-medium)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="font-semibold">Average Confidence</div>
                    <div className="text-success font-bold" style={{ fontSize: 'var(--font-size-xl)' }}>
                      {((aiAnalysis.data?.summary?.averageConfidence || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Analysis Coverage</div>
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                      {aiAnalysis.data?.totalAnalyzed || aiAnalysis.data?.summary?.totalAnalyses || 0} symbols analyzed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-xl">
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ fontSize: 'var(--font-size-4xl)', marginBottom: 'var(--spacing-md)' }}>🤖</div>
                <p className="text-muted mb-md">No AI analysis data available</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  Run Nebius AI analysis to get real-time market insights
                </p>
              </div>
              <button 
                onClick={() => {
                  fetch('/api/ai/analysis', { method: 'POST' })
                    .then(() => {
                      setTimeout(() => window.location.reload(), 2000);
                    });
                }}
                className="btn btn-primary"
                style={{ fontSize: 'var(--font-size-lg)', padding: 'var(--spacing-lg) var(--spacing-2xl)' }}
              >
                🚀 Run Nebius AI Analysis
              </button>
            </div>
          )}
        </div>

        {/* Trading Engine Control - Sidebar */}
        <div className="card card-compact col-span-12 md:col-span-4 lg:col-span-4">
          <div className="card-header">
            <h3 className="card-title">⚡ Trading Engine</h3>
          </div>
          
          {tradingEngine && tradingEngine.success ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div className={`status ${
                  tradingEngine.data.status === 'ACTIVE' ? 'status-active' : 'status-inactive'
                }`} style={{ fontSize: 'var(--font-size-lg)', padding: 'var(--spacing-md) var(--spacing-xl)' }}>
                  {tradingEngine.data.status}
                </div>
              </div>
              
              <div className="grid grid-1 mb-lg" style={{ gap: 'var(--spacing-md)' }}>
                <div className="metric-card">
                  <div className={`metric-value ${
                    (tradingEngine.data.performance?.totalProfit || 0) >= 0 
                      ? 'text-success' : 'text-danger'
                  }`}>
                    ${tradingEngine.data.performance?.totalProfit?.toFixed(2) || '0.00'}
                  </div>
                  <div className="metric-label">Total P&L</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value" style={{ color: 'var(--color-primary)' }}>
                    {tradingEngine.data.performance?.tradesCount || 0}
                  </div>
                  <div className="metric-label">Total Trades</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value text-warning">
                    {tradingEngine.data.performance?.activePositions || 0}
                  </div>
                  <div className="metric-label">Active Positions</div>
                </div>
              </div>
              
              <button 
                onClick={() => handleEngineControl(tradingEngine.data.status === 'ACTIVE' ? 'stop' : 'start')}
                className={`btn ${
                  tradingEngine.data.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'
                }`}
                style={{ width: '100%', padding: 'var(--spacing-lg)' }}
              >
                {tradingEngine.data.status === 'ACTIVE' ? '🛑 Stop Trading' : '🚀 Start Trading'}
              </button>
            </div>
          ) : (
            <div className="text-center p-xl">
              <p className="text-muted">Loading...</p>
            </div>
          )}
        </div>

        {/* Market Data - Full Width */}
        <div className="card col-span-12">
          <div className="card-header">
            <div>
              <h3 className="card-title">📊 Live Market Data</h3>
              <div className="card-subtitle">Real-time cryptocurrency prices and 24h changes</div>
            </div>
            {pricing && pricing.source && (
              <span className="status status-active">
                {pricing.source}
              </span>
            )}
          </div>
          
          {pricing && pricing.success && pricing.data && (
            <div className="grid md:grid-5 lg:grid-5">
              {Object.entries(pricing.data).map(([symbol, data]: [string, any]) => (
                <div key={symbol} className="card-stat" style={{ 
                  backgroundColor: 'var(--color-neutral-light)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-neutral-medium)',
                  transition: 'all var(--transition-normal)'
                }}>
                  <div className="font-bold mb-sm" style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-lg)' }}>
                    {symbol}
                  </div>
                  <div className="metric-value mb-sm">
                    ${typeof data.price === 'number' ? data.price.toLocaleString() : data.price}
                  </div>
                  <div className={`font-semibold mb-sm ${data.change24h >= 0 ? 'text-success' : 'text-danger'}`}>
                    {data.change24h >= 0 ? '+' : ''}{data.change24h?.toFixed(2)}%
                  </div>
                  <div className="metric-label">
                    Vol: {data.volume24h ? (data.volume24h / 1000000).toFixed(1) + 'M' : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* News Section */}
        <div className="card col-span-12 md:col-span-8 lg:col-span-8">
          <div className="card-header">
            <div>
              <h3 className="card-title">📰 Market News</h3>
              <div className="card-subtitle">Latest cryptocurrency and market updates</div>
            </div>
          </div>
          
          {news && news.success && news.data?.news ? (
            <div className="grid md:grid-2" style={{ gap: 'var(--spacing-md)' }}>
              {news.data.news.slice(0, 4).map((item: any, index: number) => (
                <div key={index} style={{ 
                  padding: 'var(--spacing-lg)', 
                  backgroundColor: 'var(--color-neutral-light)', 
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-neutral-medium)',
                  transition: 'all var(--transition-normal)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                    <span className={`status ${
                      item.impact === 'HIGH' ? 'status-inactive' :
                      item.impact === 'MEDIUM' ? 'status-warning' :
                      'status-active'
                    }`} style={{ fontSize: 'var(--font-size-xs)' }}>
                      {item.impact}
                    </span>
                    <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {new Date(item.publishedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <h4 className="font-semibold mb-sm" style={{ 
                    fontSize: 'var(--font-size-base)',
                    lineHeight: 'var(--line-height-tight)'
                  }}>
                    {item.title}
                  </h4>
                  <p className="text-muted" style={{ 
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: 'var(--line-height-normal)'
                  }}>
                    {item.description}
                  </p>
                  <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-sm)' }}>
                    {item.source}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-xl">
              <p className="text-muted">Loading market news...</p>
            </div>
          )}
        </div>

        {/* Account Summary */}
        <div className="card card-compact col-span-12 md:col-span-4 lg:col-span-4">
          <div className="card-header">
            <h3 className="card-title">💰 Account Summary</h3>
          </div>
          
          {balance && balance.success && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div className="metric-card" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                <div className="metric-value text-success">
                  ${balance.data.available?.toFixed(2) || '0.00'}
                </div>
                <div className="metric-label">Available Balance</div>
              </div>
              
              <div className="metric-card" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                <div className="metric-value" style={{ color: 'var(--color-primary)' }}>
                  {balance.data.positions?.length || 0}
                </div>
                <div className="metric-label">Active Positions</div>
              </div>

              <div style={{ 
                padding: 'var(--spacing-md)', 
                backgroundColor: 'var(--color-neutral-light)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-neutral-medium)'
              }}>
                <div className="text-center">
                  <div className="font-semibold mb-xs">Take Profit Target</div>
                  <div className="text-success font-bold" style={{ fontSize: 'var(--font-size-xl)' }}>
                    $10.00
                  </div>
                  <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                    Per Position
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Positions Table */}
        {balance && balance.success && balance.data.positions && balance.data.positions.length > 0 && (
          <div className="card col-span-12">
            <div className="card-header">
              <div>
                <h3 className="card-title">📈 Active Positions</h3>
                <div className="card-subtitle">Current trading positions with real-time P&L</div>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-neutral-medium)' }}>
                    <th style={{ textAlign: 'left', padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Symbol</th>
                    <th style={{ textAlign: 'left', padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Side</th>
                    <th style={{ textAlign: 'right', padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Size</th>
                    <th style={{ textAlign: 'right', padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Entry Price</th>
                    <th style={{ textAlign: 'right', padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Mark Price</th>
                    <th style={{ textAlign: 'right', padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Unrealized P&L</th>
                    <th style={{ textAlign: 'right', padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Take Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {balance.data.positions.map((position: any, index: number) => (
                    <tr key={index} style={{ 
                      borderBottom: '1px solid var(--color-neutral-light)',
                      transition: 'background-color var(--transition-normal)'
                    }}>
                      <td style={{ padding: 'var(--spacing-md)', fontWeight: '500', color: 'var(--color-text)' }}>
                        {position.symbol}
                      </td>
                      <td style={{ padding: 'var(--spacing-md)' }}>
                        <span className={`status ${
                          position.side === 'LONG' ? 'status-active' : 'status-inactive'
                        }`}>
                          {position.side}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--spacing-md)', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {position.size}
                      </td>
                      <td style={{ padding: 'var(--spacing-md)', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        ${position.entryPrice?.toFixed(2)}
                      </td>
                      <td style={{ padding: 'var(--spacing-md)', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        ${position.markPrice?.toFixed(2)}
                      </td>
                      <td style={{ 
                        padding: 'var(--spacing-md)', 
                        textAlign: 'right', 
                        fontWeight: '600',
                        color: position.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                      }}>
                        ${position.pnl?.toFixed(2)}
                      </td>
                      <td style={{ padding: 'var(--spacing-md)', textAlign: 'right' }}>
                        <span className={`status ${
                          position.pnl >= 10 ? 'status-active' : 'status-warning'
                        }`} style={{ fontSize: 'var(--font-size-xs)' }}>
                          {position.pnl >= 10 ? 'TARGET HIT ✅' : '$10.00'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center p-lg mt-xl" style={{ 
        backgroundColor: 'var(--color-neutral-light)', 
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-neutral-medium)'
      }}>
        <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Pramilupu Trading AI</h3>
        <p className="text-muted mb-sm">Powered by Advanced Machine Learning & Real-time Market Analysis</p>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 'var(--spacing-xl)',
          fontSize: 'var(--font-size-xs)',
          flexWrap: 'wrap'
        }}>
          {balance && balance.source && (
            <span>Balance: {balance.source}</span>
          )}
          {pricing && pricing.source && (
            <span>Pricing: {pricing.source}</span>
          )}
          {news && news.data?.source && (
            <span>News: {news.data.source}</span>
          )}
        </div>
      </footer>
        </>
      )}
    </div>
  );
}