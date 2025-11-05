import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    console.log('Test DB endpoint called');
    
    const positions = await prisma.tradingPosition.findMany();
    const trades = await prisma.tradeExecution.findMany();
    
    console.log('Found positions:', positions.length);
    console.log('Found trades:', trades.length);
    
    return NextResponse.json({
      success: true,
      data: {
        positions: positions.length,
        trades: trades.length,
        samplePosition: positions[0] || null
      }
    });
  } catch (error) {
    console.error('Test DB error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect()
  }
}