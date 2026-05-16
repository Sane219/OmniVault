"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, X, Loader2, MessageSquare, AlertTriangle } from 'lucide-react'
import { useStore, ChatMessage } from '../store/useStore'
import { authHeaders } from '../lib/auth'

function parseSSEChunk(raw: string): string {
  return raw
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5))
    .join('')
}

export function ChatPanel() {
  const { activeDocument, selectedNode, setSelectedNode, chatMessages, clearChatMessages } = useStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const prevDocRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (activeDocument !== prevDocRef.current) {
      prevDocRef.current = activeDocument
      setMessages([])
    }
  }, [activeDocument])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (selectedNode) inputRef.current?.focus()
  }, [selectedNode])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || !activeDocument || streaming) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    const aiMsgId = crypto.randomUUID()
    const aiMsg: ChatMessage = { id: aiMsgId, role: 'assistant', content: '' }

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput('')
    setStreaming(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/document/${activeDocument}/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          message: text,
          nodeContext: selectedNode ?? undefined,
        }),
      })

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Request failed (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const raw = decoder.decode(value, { stream: true })
        const parsed = parseSSEChunk(raw)
        if (!parsed) continue

        if (parsed.startsWith('ERROR:')) {
          const errorText = parsed.slice(6).trim()
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, content: errorText, isError: true }
                : msg
            )
          )
          reader.cancel()
          break
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? { ...msg, content: msg.content + parsed }
              : msg
          )
        )
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return

      const errorText = err instanceof Error ? err.message : 'An unknown error occurred.'
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, content: errorText, isError: true }
            : msg
        )
      )
    } finally {
      setStreaming(false)
    }
  }, [input, activeDocument, selectedNode, streaming])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-terminal/30 border-t border-panel-border">

      {/* Header */}
      <div className="h-12 px-4 border-b border-panel-border bg-panel/40 flex items-center justify-between shrink-0">
        <div className="section-line">
          <MessageSquare className="w-4 h-4 text-matrix-green" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-text-bright">RAG CHAT</span>
        </div>
        {selectedNode && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-matrix-green-faint border border-matrix-green-dim rounded-terminal">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-dim">ctx:</span>
            <span className="text-[10px] font-mono font-bold text-matrix-green truncate max-w-[120px]">
              {selectedNode.label}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-text-dim hover:text-matrix-green cursor-pointer transition-colors ml-1 hover-glitch"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-dim gap-3">
            <div className="w-12 h-12 rounded-terminal bg-panel border border-panel-border flex items-center justify-center">
              <Bot className="w-6 h-6 text-matrix-green/30" />
            </div>
            <p className="text-sm font-mono">
              {activeDocument
                ? 'Query the document intelligence engine.\nSelect a graph node to focus context.'
                : 'Upload a document to initialize chat.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-terminal flex items-center justify-center shrink-0 mt-0.5 border ${
              msg.isError
                ? 'bg-red-alert/10 border-red-alert/30'
                : msg.role === 'user'
                  ? 'bg-matrix-green-faint border-matrix-green-dim'
                  : 'bg-blue-data/10 border-blue-data/30'
            }`}>
              {msg.isError
                ? <AlertTriangle className="w-3.5 h-3.5 text-red-alert" />
                : msg.role === 'user'
                  ? <User className="w-3.5 h-3.5 text-matrix-green" />
                  : <Bot className="w-3.5 h-3.5 text-blue-data" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-terminal text-sm leading-relaxed whitespace-pre-wrap break-words border ${
              msg.isError
                ? 'bg-red-alert/5 border-red-alert/20 text-red-alert rounded-tl-none'
                : msg.role === 'user'
                  ? 'bg-matrix-green-faint border-matrix-green-dim text-text-normal rounded-tr-none'
                  : 'bg-panel border-panel-border text-text-normal rounded-tl-none'
            }`}>
              {!msg.content && streaming && msg.role === 'assistant' && !msg.isError && (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-matrix-green animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-matrix-green animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-matrix-green animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
              {msg.content}
              {streaming && msg.role === 'assistant' && msg.content && !msg.isError && (
                <span className="inline-block w-0.5 h-4 bg-matrix-green/70 ml-0.5 align-middle animate-pulse" />
              )}
              {msg.isError && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-red-alert font-mono uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3" /> system error — verify api key
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-panel-border bg-panel/20 shrink-0">
        <div className={`flex gap-2 items-end rounded-terminal border transition-all duration-100 ${
          activeDocument
            ? 'border-matrix-green-dim focus-within:border-matrix-green focus-within:shadow-neon bg-black/40'
            : 'border-text-ghost bg-black/20 opacity-40'
        }`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeDocument || streaming}
            placeholder={
              !activeDocument
                ? 'awaiting document upload...'
                : selectedNode
                ? `query "${selectedNode.label}"…`
                : 'enter query…'
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-text-normal placeholder-text-dim resize-none px-3 py-2.5 focus:outline-none disabled:cursor-not-allowed min-h-[40px] max-h-[120px] font-mono"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={sendMessage}
            disabled={!activeDocument || !input.trim() || streaming}
            className="mb-1.5 mr-1.5 p-2 bg-transparent border border-matrix-green text-matrix-green hover:bg-matrix-green-faint hover:shadow-neon disabled:border-text-ghost disabled:text-text-ghost disabled:hover:bg-transparent disabled:hover:shadow-none rounded-terminal transition-all cursor-pointer shrink-0"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-text-dim mt-1.5 text-center font-mono uppercase tracking-wider">
          <kbd className="px-1 bg-panel border border-panel-border rounded-terminal text-text-dim">Enter</kbd> transmit ·{' '}
          <kbd className="px-1 bg-panel border border-panel-border rounded-terminal text-text-dim">Shift+Enter</kbd> newline
        </p>
      </div>
    </div>
  )
}
