'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetricsData {
  success: boolean
  data: {
    performance: {
      totalTrades: number
      successfulTrades: number
      failedTrades: number
      totalVolume: number
    }
    positions: {
      count: number
      totalValue: number
    }
    systemHealth: {
      uptime: number
      memoryUsage: number
      services: {
        nebiusAI: { status: string }
        gateExchange: { status: string }
      }
    }
  }
}

export function MetricsChart() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/trading/dashboard')
        const data = await response.json()
        setMetrics(data)
      } catch (error) {
        console.error('Error fetching metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading metrics...</div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics || !metrics.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">Failed to load metrics</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.data.performance.totalTrades}</div>
            <div className="text-sm text-gray-500">Total Trades</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.data.performance.successfulTrades}</div>
            <div className="text-sm text-gray-500">Successful</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{metrics.data.positions.count}</div>
            <div className="text-sm text-gray-500">Active Positions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{Math.round(metrics.data.performance.totalVolume)}</div>
            <div className="text-sm text-gray-500">Volume</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center text-sm">
            <span>AI: <span className={`font-semibold ${metrics.data.systemHealth.services.nebiusAI.status === 'up' ? 'text-green-600' : 'text-red-600'}`}>{metrics.data.systemHealth.services.nebiusAI.status}</span></span>
            <span>Exchange: <span className={`font-semibold ${metrics.data.systemHealth.services.gateExchange.status === 'up' ? 'text-green-600' : 'text-red-600'}`}>{metrics.data.systemHealth.services.gateExchange.status}</span></span>
            <span>Uptime: <span className="font-semibold">{Math.floor(metrics.data.systemHealth.uptime / 60)}m</span></span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricsChart