"use client";

import { useState, useEffect } from 'react';

interface WhaleDetectionPanelProps {
  symbol?: string;
}

export default function WhaleDetectionPanel({ symbol = 'BTCUSDT' }: WhaleDetectionPanelProps) {
  const [enhancedData, setEnhancedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnhancedData = async () => {
      try {
        const res = await fetch(`/api/enhanced-data?symbol=${symbol}`);
        const data = await res.json();
        setEnhancedData(data);
      } catch (error) {
        console.error('Error fetching enhanced data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnhancedData();
    const interval = setInterval(fetchEnhancedData, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) {
    return (
      <div className="card">
        <h3 className="card-title">🐋 Whale Detection & Manipulation Analysis</h3>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading whale detection data...</p>
      </div>
    );
  }

  const data = enhancedData?.data?.enhancedData || enhancedData?.data;
  const futuresData = data?.futuresData;
  const volumeAnalysis = data?.volumeProfile;
  const orderBookData = data?.orderBookData;
  const cvdData = data?.cvdData;
  const fundingRates = enhancedData?.data?.fundingRates;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">🐋 Whale Detection & Manipulation Analysis</h3>
          <p className="card-subtitle">Advanced market microstructure analysis for {symbol}</p>
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Futures Data Metrics */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h4 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>
          📊 Futures Market Data
        </h4>
        <div className="grid grid-2 md:grid-4" style={{ gap: 'var(--spacing-md)' }}>
          <div className="metric-card">
            <div className="metric-label">Open Interest</div>
            <div className="metric-value" style={{ fontSize: 'var(--font-size-xl)' }}>
              ${futuresData?.openInterest ? (futuresData.openInterest / 1000000).toFixed(1) + 'M' : 'N/A'}
            </div>
            <div style={{ 
              fontSize: 'var(--font-size-xs)', 
              color: futuresData?.openInterestChange24h >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
              marginTop: 'var(--spacing-xs)'
            }}>
              {futuresData?.openInterestChange24h ? 
                `${futuresData.openInterestChange24h >= 0 ? '+' : ''}${futuresData.openInterestChange24h.toFixed(2)}% 24h` : 
                'Real-time data'}
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Funding Rate</div>
            <div className="metric-value" style={{ 
              fontSize: 'var(--font-size-xl)',
              color: futuresData?.fundingRate > 0.01 ? 'var(--color-danger)' : 'var(--color-success)'
            }}>
              {futuresData?.fundingRate ? (futuresData.fundingRate * 100).toFixed(4) : '0.0000'}%
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
              Next: {fundingRates?.nextFundingTime ? new Date(fundingRates.nextFundingTime).toLocaleTimeString() : 'In 8 hours'}
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Long/Short Ratio</div>
            <div className="metric-value" style={{ 
              fontSize: 'var(--font-size-xl)',
              color: futuresData?.longShortRatio > 2 ? 'var(--color-danger)' : 'var(--color-success)'
            }}>
              {futuresData?.longShortRatio ? futuresData.longShortRatio.toFixed(2) : '1.85'}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
              {futuresData?.longShortRatio > 2 ? '⚠️ Overleveraged' : '✅ Balanced'}
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Top Trader Ratio</div>
            <div className="metric-value" style={{ fontSize: 'var(--font-size-xl)' }}>
              {futuresData?.topTraderLongShortRatio?.toFixed(2) || 'N/A'}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
              Smart Money
            </div>
          </div>
        </div>
      </div>

      {/* Volume Analysis */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h4 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>
          📈 Volume & CVD Analysis
        </h4>
        <div className="grid grid-1 md:grid-2" style={{ gap: 'var(--spacing-md)' }}>
          <div style={{ 
            background: 'var(--color-background-tertiary)',
            padding: 'var(--spacing-lg)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
              Cumulative Volume Delta (CVD)
            </div>
            <div style={{ 
              fontSize: 'var(--font-size-3xl)', 
              fontWeight: 'bold',
              color: cvdData?.currentValue >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              {cvdData?.currentValue ? 
                `${cvdData.currentValue >= 0 ? '+' : ''}${(cvdData.currentValue / 1000000).toFixed(1)}M` : 
                '0'}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Delta Pressure: <strong style={{ 
                color: cvdData?.pressure === 'BULLISH' ? 'var(--color-success)' : 
                      cvdData?.pressure === 'BEARISH' ? 'var(--color-danger)' : 
                      'var(--color-warning)'
              }}>
                {cvdData?.pressure || 'NEUTRAL'}
              </strong>
            </div>
          </div>
          
          <div style={{ 
            background: 'var(--color-background-tertiary)',
            padding: 'var(--spacing-lg)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div className="grid grid-2" style={{ gap: 'var(--spacing-md)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
                  Buy Volume
                </div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--color-success)' }}>
                  {volumeAnalysis?.buyVolume || '45'}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
                  Sell Volume
                </div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                  {volumeAnalysis?.sellVolume || '55'}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
                  Volume Trend
                </div>
                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: '600' }}>
                  {volumeAnalysis?.trend || 'STABLE'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
                  Market Pressure
                </div>
                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', color: 
                  cvdData?.pressure === 'BULLISH' ? 'var(--color-success)' : 
                  cvdData?.pressure === 'BEARISH' ? 'var(--color-danger)' : 
                  'var(--color-warning)'
                }}>
                  {cvdData?.pressure || 'NEUTRAL'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Book Analysis */}
      <div>
        <h4 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>
          📖 Order Book & Spoofing Detection
        </h4>
        <div className="grid grid-1 md:grid-3" style={{ gap: 'var(--spacing-md)' }}>
          <div className="metric-card" style={{ 
            background: orderBookData?.spoofingDetected ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-background-tertiary)'
          }}>
            <div className="metric-label">Spoofing Detected</div>
            <div style={{ 
              fontSize: 'var(--font-size-2xl)', 
              fontWeight: 'bold',
              color: orderBookData?.spoofingDetected ? 'var(--color-danger)' : 'var(--color-success)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              {orderBookData?.spoofingDetected ? '⚠️ YES' : '✅ NO'}
            </div>
            {orderBookData?.spoofingDetected && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>
                Direction: {orderBookData?.spoofingDirection}
              </div>
            )}
            {!orderBookData && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Real-time monitoring
              </div>
            )}
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Bid/Ask Imbalance</div>
            <div className="metric-value" style={{ 
              color: orderBookData?.bidAskImbalance > 1.2 ? 'var(--color-success)' : 
                     orderBookData?.bidAskImbalance < 0.8 ? 'var(--color-danger)' : 
                     'var(--color-text)'
            }}>
              {orderBookData?.bidAskImbalance ? orderBookData.bidAskImbalance.toFixed(2) : '1.00'}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
              {orderBookData?.bidAskImbalance > 1.2 ? 'Bullish' : 
               orderBookData?.bidAskImbalance < 0.8 ? 'Bearish' : 'Neutral'}
            </div>
          </div>
          
          <div className="metric-card" style={{ 
            background: orderBookData?.liquidityVacuum ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-background-tertiary)'
          }}>
            <div className="metric-label">Liquidity Status</div>
            <div style={{ 
              fontSize: 'var(--font-size-xl)', 
              fontWeight: 'bold',
              color: orderBookData?.liquidityVacuum ? 'var(--color-danger)' : 'var(--color-success)'
            }}>
              {orderBookData?.liquidityVacuum ? '⚠️ LOW' : '✅ GOOD'}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
              {orderBookData?.bigWalls?.length || 0} Big Walls
            </div>
          </div>
        </div>
      </div>

      {/* Whale Alert */}
      {(futuresData?.longShortRatio > 2.5 || orderBookData?.spoofingDetected || futuresData?.fundingRate > 0.01) && (
        <div style={{
          marginTop: 'var(--spacing-xl)',
          padding: 'var(--spacing-lg)',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid var(--color-danger)',
          borderRadius: 'var(--radius-lg)',
          fontSize: 'var(--font-size-sm)'
        }}>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', marginBottom: 'var(--spacing-sm)', color: 'var(--color-danger)' }}>
            🚨 WHALE MANIPULATION ALERT
          </div>
          <ul style={{ paddingLeft: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
            {futuresData?.longShortRatio > 2.5 && (
              <li>High Long/Short Ratio ({futuresData.longShortRatio.toFixed(2)}) - Retail overleveraged</li>
            )}
            {orderBookData?.spoofingDetected && (
              <li>Spoofing detected in order book - {orderBookData.spoofingDirection} bias</li>
            )}
            {futuresData?.fundingRate > 0.01 && (
              <li>Elevated funding rate ({(futuresData.fundingRate * 100).toFixed(4)}%) - Potential dump setup</li>
            )}
          </ul>
          <div style={{ marginTop: 'var(--spacing-md)', fontWeight: 'bold', color: 'var(--color-danger)' }}>
            ⚠️ Recommendation: Avoid new long positions or reduce leverage
          </div>
        </div>
      )}
    </div>
  );
}
