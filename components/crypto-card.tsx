'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PricingData {
  success: boolean
  data: {
    [key: string]: {
      price: number
      change24h: number
      volume24h: number
      high24h: number
      low24h: number
    }
  }
}

export function CryptoCard() {
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch('/api/pricing')
        const data = await response.json()
        setPricing(data)
      } catch (error) {
        console.error('Error fetching pricing:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPricing()
    const interval = setInterval(fetchPricing, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Crypto Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading prices...</div>
        </CardContent>
      </Card>
    )
  }

  if (!pricing || !pricing.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Crypto Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">Failed to load pricing data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crypto Prices</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(pricing.data).map(([symbol, data]) => (
            <div key={symbol} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">{symbol}</div>
                <div className="text-sm text-gray-500">Vol: ${data.volume24h.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">${data.price.toLocaleString()}</div>
                <div className={`text-sm ${data.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default CryptoCard