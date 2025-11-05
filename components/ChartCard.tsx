"use client";

import { useState, useEffect } from 'react';

interface ChartCardProps {
  title: string;
  data?: any[];
  type?: 'line' | 'bar' | 'area';
  height?: number;
  loading?: boolean;
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
}

export default function ChartCard({
  title,
  data = [],
  type = 'line',
  height = 200,
  loading = false,
  timeframe = '1D',
  onTimeframeChange
}: ChartCardProps) {
  const [mockData, setMockData] = useState<number[]>([]);

  // Generate mock chart data
  useEffect(() => {
    const generateMockData = () => {
      const points = 20;
      const data = [];
      let value = 100;
      
      for (let i = 0; i < points; i++) {
        value += (Math.random() - 0.5) * 10;
        data.push(Math.max(0, value));
      }
      
      return data;
    };

    setMockData(generateMockData());
  }, [timeframe]);

  const timeframes = ['1H', '4H', '1D', '1W', '1M'];

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="loading-skeleton w-full h-full rounded-lg"></div>
        </div>
      );
    }

    const chartData = data.length > 0 ? data : mockData;
    const max = Math.max(...chartData);
    const min = Math.min(...chartData);
    const range = max - min;

    if (type === 'line' || type === 'area') {
      const points = chartData.map((value, index) => {
        const x = (index / (chartData.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
      }).join(' ');

      return (
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(0, 156, 193, 0.8)" />
              <stop offset="100%" stopColor="rgba(0, 156, 193, 0.1)" />
            </linearGradient>
          </defs>
          
          {type === 'area' && (
            <polygon
              points={`0,100 ${points} 100,100`}
              fill="url(#chartGradient)"
              className="animate-fade-in"
            />
          )}
          
          <polyline
            points={points}
            fill="none"
            stroke="rgba(0, 156, 193, 1)"
            strokeWidth="0.5"
            className="animate-fade-in"
            style={{
              filter: 'drop-shadow(0 0 4px rgba(0, 156, 193, 0.5))'
            }}
          />
          
          {/* Data points */}
          {chartData.map((value, index) => {
            const x = (index / (chartData.length - 1)) * 100;
            const y = 100 - ((value - min) / range) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="0.5"
                fill="rgba(0, 156, 193, 1)"
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              />
            );
          })}
        </svg>
      );
    }

    if (type === 'bar') {
      return (
        <div className="flex items-end justify-between h-full gap-1">
          {chartData.map((value, index) => {
            const height = ((value - min) / range) * 100;
            return (
              <div
                key={index}
                className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t animate-slide-up"
                style={{ 
                  height: `${height}%`,
                  animationDelay: `${index * 100}ms`
                }}
              />
            );
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="glass-card p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        
        {onTimeframeChange && (
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  timeframe === tf
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div className="chart-container" style={{ height: `${height}px` }}>
        {renderChart()}
      </div>

      {/* Chart Stats */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
        <div className="text-center">
          <div className="text-sm font-medium text-green-400">
            {mockData.length > 0 ? Math.max(...mockData).toFixed(2) : '0.00'}
          </div>
          <div className="text-xs text-gray-400">High</div>
        </div>
        
        <div className="text-center">
          <div className="text-sm font-medium text-red-400">
            {mockData.length > 0 ? Math.min(...mockData).toFixed(2) : '0.00'}
          </div>
          <div className="text-xs text-gray-400">Low</div>
        </div>
        
        <div className="text-center">
          <div className="text-sm font-medium text-blue-400">
            {mockData.length > 0 ? mockData[mockData.length - 1].toFixed(2) : '0.00'}
          </div>
          <div className="text-xs text-gray-400">Current</div>
        </div>
      </div>
    </div>
  );
}