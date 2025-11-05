import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      include: {
        tradings: true
      }
    })

    return NextResponse.json({ data: chats })
  } catch (error) {
    console.error('Error fetching chats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { model, chat, reasoning, userPrompt } = body

    const newChat = await prisma.chat.create({
      data: {
        model: model || 'Deepseek',
        chat: chat || '<no chat>',
        reasoning: reasoning || '',
        userPrompt: userPrompt || ''
      }
    })

    return NextResponse.json(newChat)
  } catch (error) {
    console.error('Error creating chat:', error)
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    )
  }
}