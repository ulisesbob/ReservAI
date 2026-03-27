"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare } from "lucide-react"

interface EscalatedChat {
  id: string
  customerPhone: string
  customerName: string | null
  lastMessage: string
  lastMessageRole: string | null
  escalatedAt: string
  escalatedReason: string | null
}

export default function ChatsPage() {
  const [chats, setChats] = useState<EscalatedChat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch("/api/conversations/escalated")
        if (res.ok) setChats(await res.json())
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    fetchChats()
    const interval = setInterval(fetchChats, 5000)
    return () => clearInterval(interval)
  }, [])

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Chats escalados</h1>
        <p className="text-sm text-muted-foreground mt-1">Conversaciones que necesitan atención humana</p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
      ) : chats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No hay chats escalados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <Link key={chat.id} href={`/dashboard/chats/${chat.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{chat.customerName || chat.customerPhone}</span>
                      <Badge variant="destructive" className="text-[10px]">{timeAgo(chat.escalatedAt!)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {chat.lastMessageRole === "USER" ? "Cliente: " : "Bot: "}{chat.lastMessage}
                    </p>
                  </div>
                  {chat.escalatedReason && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {chat.escalatedReason === "customer_request" ? "Pidió humano" : "Bot no resolvió"}
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
