"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, X, Loader2, MessageSquare, AlertTriangle } from 'lucide-react'
import { useStore, ChatMessage } from '../store/useStore'
import { authHeaders } from '../lib/auth'

/**
 * Parses SSE-formatted text: "data: <text>\n\n"
 * Returns the joined data content.
 */
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

  // Sync local messages with store when document changes
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

        // ── Check for streamed error from backend ─────────────────────────
        if (parsed.startsWith('ERROR:')) {
          const errorText = parsed.slice(6).trim()
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, content: errorText, isError: true }
                : msg
            )
          )
          // Drain and close the reader then stop
          reader.cancel()
          break
        }

        // ── Append valid chunk ─────────────────────────────────────────────
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
    <div className="flex flex-col h-full bg-background/50 border-t border-gray-800">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="h-12 px-4 border-b border-gray-800 bg-secondary/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cta" />
          <span className="font-mono text-xs font-semibold tracking-wider text-gray-300">RAG CHAT</span>
        </div>
        {selectedNode && (
          <div className="flex items-center gap-2 px-2 py-1 bg-cta/10 border border-cta/30 rounded-lg">
            <span className="text-[10px] font-mono text-cta/80">Context:</span>
            <span className="text-[10px] font-mono font-bold text-cta truncate max-w-[120px]">
              {selectedNode.label}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-500 hover:text-gray-300 cursor-pointer transition-colors ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 gap-3">
            <Bot className="w-10 h-10 opacity-40" />
            <p className="text-sm">
              {activeDocument
                ? 'Ask anything about this document.\nClick a graph node to focus your question.'
                : 'Upload a document to start chatting.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              msg.isError
                ? 'bg-red-900/40 border border-red-500/40'
                : msg.role === 'user'
                  ? 'bg-cta/20 border border-cta/40'
                  : 'bg-blue-900/40 border border-blue-500/40'
            }`}>
              {msg.isError
                ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                : msg.role === 'user'
                  ? <User className="w-3.5 h-3.5 text-cta" />
                  : <Bot className="w-3.5 h-3.5 text-blue-400" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
              msg.isError
                ? 'bg-red-900/20 border border-red-700 text-red-300 rounded-tl-none'
                : msg.role === 'user'
                  ? 'bg-cta/10 border border-cta/20 text-gray-200 rounded-tr-none'
                  : 'bg-secondary/60 border border-gray-700 text-gray-300 rounded-tl-none'
            }`}>
              {/* Bouncing dots before first token arrives */}
              {!msg.content && streaming && msg.role === 'assistant' && !msg.isError && (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
              {msg.content}
              {/* Blinking cursor while streaming this message */}
              {streaming && msg.role === 'assistant' && msg.content && !msg.isError && (
                <span className="inline-block w-0.5 h-4 bg-cta/70 ml-0.5 align-middle animate-pulse" />
              )}
              {/* Error label */}
              {msg.isError && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-red-500 font-mono">
                  <AlertTriangle className="w-3 h-3" /> AI error — check your API key or try again
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Input ───────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-gray-800 bg-secondary/20 shrink-0">
        <div className={`flex gap-2 items-end rounded-xl border transition-colors ${
          activeDocument
            ? 'border-gray-700 focus-within:border-cta/50 bg-background/60'
            : 'border-gray-800 bg-background/20 opacity-50'
        }`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeDocument || streaming}
            placeholder={
              !activeDocument
                ? 'Upload a document first...'
                : selectedNode
                ? `Ask about "${selectedNode.label}"…`
                : 'Ask anything about this document…'
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-600 resize-none px-3 py-2.5 focus:outline-none disabled:cursor-not-allowed min-h-[40px] max-h-[120px]"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={sendMessage}
            disabled={!activeDocument || !input.trim() || streaming}
            className="mb-1.5 mr-1.5 p-2 bg-cta hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white transition-colors cursor-pointer shrink-0"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 text-center">
          Press <kbd className="px-1 bg-gray-800 rounded text-gray-500">Enter</kbd> to send ·{' '}
          <kbd className="px-1 bg-gray-800 rounded text-gray-500">Shift+Enter</kbd> for newline
        </p>
      </div>
    </div>
  )
}
