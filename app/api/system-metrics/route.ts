import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Return JSON metrics for frontend consumption
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        cpu: {
          usage: process.cpuUsage()
        }
      },
      trading: {
        activePositions: 0,
        totalTrades: 0,
        isRunning: false
      },
      services: {
        database: "connected",
        ai: "disconnected", 
        exchange: "disconnected"
      }
    }

    // Force JSON response with proper headers
    const response = new Response(JSON.stringify(metrics), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    })

    return response
  } catch (error) {
    console.error('Error fetching metrics:', error)
    
    const errorResponse = new Response(JSON.stringify({ 
      error: 'Failed to fetch metrics',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })

    return errorResponse
  }
}