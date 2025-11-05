import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const GET = async (request: NextRequest) => {
  try {
    // Get database metrics
    const totalChats = await prisma.chat.count()
    const totalTrades = await prisma.trading.count()
    const totalPositions = await prisma.tradingPosition.count()
    const activePositions = await prisma.tradingPosition.count({
      where: { status: 'OPEN' }
    })
    
    // Get recent activity (last 24 hours)
    const recentTrades = await prisma.trading.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })

    const dashboardData = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        totalChats,
        totalTrades,
        totalPositions,
        activePositions,
        recentTrades,
        systemStatus: {
          database: 'connected',
          uptime: Math.floor(process.uptime()),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          }
        },
        trading: {
          isActive: false,
          lastUpdate: new Date().toISOString()
        }
      }
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data',
      data: {
        totalChats: 0,
        totalTrades: 0,
        totalPositions: 0,
        activePositions: 0,
        recentTrades: 0,
        systemStatus: {
          database: 'disconnected',
          uptime: Math.floor(process.uptime()),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          }
        }
      }
    }, { status: 500 });
  }
};