// Health Check API Endpoint
// Requirements: 7.3, 7.4

import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/trading-bot/database";
import { environmentManager } from "@/lib/trading-bot/config/environment";

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    trading: {
      status: 'healthy' | 'unhealthy' | 'inactive';
      sessionActive?: boolean;
      error?: string;
    };
    ai: {
      status: 'healthy' | 'unhealthy' | 'unknown';
      error?: string;
    };
    exchange: {
      status: 'healthy' | 'unhealthy' | 'unknown';
      error?: string;
    };
  };
  metrics: {
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    cpuUsage?: number;
  };
}

/**
 * GET /api/health
 * Comprehensive health check endpoint
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    const config = environmentManager.getConfig();
    
    // Initialize health status
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.NODE_ENV,
      services: {
        database: { status: 'unhealthy' },
        trading: { status: 'unhealthy' },
        ai: { status: 'unknown' },
        exchange: { status: 'unknown' }
      },
      metrics: {
        memoryUsage: {
          used: 0,
          total: 0,
          percentage: 0
        }
      }
    };

    // Check database health
    try {
      const dbStartTime = Date.now();
      const db = DatabaseService.getInstance();
      const isHealthy = await db.healthCheck();
      const dbResponseTime = Date.now() - dbStartTime;
      
      health.services.database = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime: dbResponseTime
      };
    } catch (error) {
      health.services.database = {
        status: 'unhealthy',
        error: (error as Error).message
      };
    }

    // Check trading engine status
    try {
      const { getTradingEngine } = await import('@/lib/trading-engine/trading-engine');
      const engine = getTradingEngine();
      const state = engine.getState();
      
      health.services.trading = {
        status: state.isRunning ? 'healthy' : 'inactive',
        sessionActive: state.isRunning
      };
    } catch (error) {
      health.services.trading = {
        status: 'inactive',
        sessionActive: false
      };
    }

    // Get memory usage
    const memUsage = process.memoryUsage();
    health.metrics.memoryUsage = {
      used: Math.round(memUsage.rss / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.rss / memUsage.heapTotal) * 100)
    };

    // Determine overall health status
    const unhealthyServices = Object.values(health.services).filter(
      service => service.status === 'unhealthy'
    ).length;

    if (unhealthyServices > 0) {
      health.status = unhealthyServices >= 2 ? 'unhealthy' : 'degraded';
    }

    // Set appropriate HTTP status code
    const httpStatus = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: httpStatus });

  } catch (error) {
    console.error("Health check failed:", error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      uptime: process.uptime()
    }, { status: 503 });
  }
}

/**
 * GET /api/health/ready
 * Readiness probe for Kubernetes
 */
export async function HEAD() {
  try {
    // Quick readiness check - just verify database connection
    const db = DatabaseService.getInstance();
    const isReady = await db.healthCheck();
    
    return new Response(null, { 
      status: isReady ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    return new Response(null, { status: 503 });
  }
}