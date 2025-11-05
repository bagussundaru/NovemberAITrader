import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Get system metrics
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    // Get database metrics
    const totalChats = await prisma.chat.count()
    const totalTradings = await prisma.trading.count()
    const totalPositions = await prisma.tradingPosition.count()
    const totalSignals = await prisma.tradingSignal.count()
    
    // Get recent activity
    const recentChats = await prisma.chat.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })
    
    const recentTrades = await prisma.trading.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
        },
        cpu: {
          usage: process.cpuUsage()
        }
      },
      database: {
        totalChats,
        totalTradings,
        totalPositions,
        totalSignals,
        recentActivity: {
          chats24h: recentChats,
          trades24h: recentTrades
        }
      },
      trading: {
        activePositions: await prisma.tradingPosition.count({
          where: { status: 'OPEN' }
        }),
        pendingTrades: await prisma.tradeExecution.count({
          where: { status: 'PENDING' }
        })
      }
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}