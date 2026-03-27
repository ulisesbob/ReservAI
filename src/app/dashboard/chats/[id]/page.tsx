"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Send, CheckCircle } from "lucide-react"
import Link from "next/link"

interface Message {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  createdAt: string
}

interface ConversationInfo {
  id: string
  customerPhone: string
  status: string
  escalatedAt: string | null
  escalatedReason: string | null
}

export default function ChatViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<ConversationInfo | null>(null)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [resolving, setResolving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/conversations/${id}/messages`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages)
          setConversation(data.conversation)
        }
      } catch { /* ignore */ }
    }
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    if (!reply.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages((prev) => [...prev, msg])
        setReply("")
      }
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  async function handleResolve() {
    setResolving(true)
    try {
      await fetch(`/api/conversations/${id}/resolve`, { method: "POST" })
      router.push("/dashboard/chats")
    } catch { /* ignore */ }
    finally { setResolving(false) }
  }

  const isResolved = conversation?.status === "COMPLETED"

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/chats"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-lg font-bold">{conversation?.customerPhone || "..."}</h1>
            <p className="text-xs text-muted-foreground">
              {conversation?.escalatedReason === "customer_request" ? "Pidió hablar con humano" : "Bot no pudo resolver"}
            </p>
          </div>
        </div>
        {!isResolved && (
          <Button variant="outline" size="sm" onClick={handleResolve} disabled={resolving}>
            <CheckCircle className="w-4 h-4 mr-1" />{resolving ? "Cerrando..." : "Resolver"}
          </Button>
        )}
      </div>
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-4 h-full overflow-y-auto space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "USER" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${msg.role === "USER" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.role === "USER" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </CardContent>
      </Card>
      {!isResolved && (
        <div className="flex gap-2 mt-4">
          <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escribí un mensaje..." className="h-11"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} />
          <Button className="h-11 px-4" onClick={handleSend} disabled={sending || !reply.trim()}><Send className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  )
}
