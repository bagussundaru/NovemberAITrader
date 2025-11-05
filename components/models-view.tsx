'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Chat {
  id: string
  model: string
  chat: string
  reasoning: string
  userPrompt: string
  createdAt: string
  tradings: any[]
}

interface ChatsData {
  success: boolean
  data: Chat[]
}

export function ModelsView() {
  const [chats, setChats] = useState<ChatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('/api/model/chat')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setChats({ success: true, data })
      } catch (error) {
        console.error('Error fetching chats:', error)
        setChats({ success: false, data: [] })
      } finally {
        setLoading(false)
      }
    }

    fetchChats()
    const interval = setInterval(fetchChats, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Models Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading activity...</div>
        </CardContent>
      </Card>
    )
  }

  if (!chats || !chats.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Models Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">Failed to load AI activity</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Models Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {chats.data.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No AI activity yet</div>
        ) : (
          <div className="space-y-3">
            {chats.data.slice(0, 5).map((chat) => (
              <div key={chat.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-sm">{chat.model}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(chat.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  <strong>Prompt:</strong> {chat.userPrompt.substring(0, 100)}...
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Trades:</strong> {chat.tradings.length}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ModelsView