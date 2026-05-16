"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Upload, FileText, Settings, Activity, Network,
  CheckCircle2, AlertCircle, Loader2, ChevronLeft,
  ChevronRight, Clock, Key
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { ApiKeyModal } from '../../components/ApiKeyModal'
import { KnowledgeGraph } from '../../components/KnowledgeGraph'
import { ChatPanel } from '../../components/ChatPanel'
import { PdfViewer } from '../../components/PdfViewer'
import { authHeaders } from '../../lib/auth'
import { DocumentListSkeleton, GraphSkeleton } from '../../components/Skeleton'
import { ErrorBoundary } from '../../components/ErrorBoundary'

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed' | 'error'

interface DocumentRecord {
  id: string
  title: string
  status: string
  error_message?: string
  created_at?: string
}

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    uploaded: 'bg-gray-700 text-gray-300',
    processing: 'bg-yellow-900/40 text-yellow-300',
    completed: 'bg-green-900/40 text-green-300',
    failed: 'bg-red-900/40 text-red-300',
  }
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${map[status] ?? 'bg-gray-700 text-gray-400'}`}>
      {status.toUpperCase()}
    </span>
  )
}

// ── Status Icon ─────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: ProcessingStatus }) {
  if (status === 'idle') return <div className="w-3 h-3 rounded-full bg-gray-600" />
  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <div key={delay} className="w-2 h-2 rounded-full bg-cta animate-bounce" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    )
  }
  if (status === 'completed') return <CheckCircle2 className="w-6 h-6 text-cta" />
  if (status === 'failed' || status === 'error') return <AlertCircle className="w-6 h-6 text-red-400" />
  return null
}

export default function WorkspacePage() {
  const { activeDocument, setActiveDocument } = useStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('Awaiting document upload...')
  const [errorMessage, setErrorMessage] = useState('')
  const [graphData, setGraphData] = useState<any>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)

  const [history, setHistory] = useState<DocumentRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const router = useRef<any>(null) // Use router if available or redirect manually

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = document.cookie.match(/omnivault_token=([^;]+)/)
    if (!token) {
      window.location.href = '/login'
    }
  }, [])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const closeWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/documents`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to load history')
      const data = await res.json()
      setHistory(data.documents ?? [])
    } catch (e) {
      console.warn('History fetch failed:', e)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const fetchGraph = useCallback(async (documentId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/document/${documentId}/graph`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Failed to fetch graph (${res.status})`)
      const data = await res.json()
      setGraphData(data)
      setProcessingStatus('completed')
      setStatusMessage('Processing complete. Knowledge graph generated.')
      await fetchHistory()
    } catch (err) {
      setProcessingStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load graph data.')
    }
  }, [fetchHistory])

  const connectWs = useCallback((documentId: string) => {
    closeWs()

    const token = document.cookie.match(/omnivault_token=([^;]+)/)?.[1]
    if (!token) return

    const wsUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080')
      .replace(/^http/, 'ws') + `/ws/document?id=${documentId}&token=${token}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data)

        if (data.error) {
          setProcessingStatus('error')
          setErrorMessage(data.error)
          return
        }

        if (data.file_path) setDocumentUrl(data.file_path)
        if (data.message) setStatusMessage(data.message)

        if (data.status === 'completed') {
          setProcessingStatus('processing')
          setStatusMessage('Loading graph...')
          await fetchGraph(documentId)
        } else if (data.status === 'failed') {
          setProcessingStatus('failed')
          setErrorMessage(data.error_message || data.message || 'Processing failed.')
          await fetchHistory()
        }
      } catch (err) {
        console.warn('WS message parse error:', err)
      }
    }

    ws.onerror = () => {
      // Fallback: WS failed, use polling
      console.warn('WebSocket failed, falling back to polling')
      startPollingFallback(documentId)
    }

    ws.onclose = () => {
      wsRef.current = null
    }
  }, [closeWs, fetchGraph, fetchHistory])

  // Fallback polling if WebSocket fails
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const startPollingFallback = useCallback((documentId: string) => {
    stopPolling()
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/document/${documentId}/status`, { headers: authHeaders() })
        if (!res.ok) return
        const data = await res.json()

        if (data.file_path) setDocumentUrl(data.file_path)

        if (data.status === 'completed') {
          stopPolling()
          await fetchGraph(documentId)
        } else if (data.status === 'failed') {
          stopPolling()
          setProcessingStatus('failed')
          setErrorMessage(data.error_message || 'Processing failed.')
          await fetchHistory()
        }
      } catch (err) {
        stopPolling()
        setProcessingStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Polling failed.')
      }
    }, 2000)
  }, [stopPolling, fetchGraph, fetchHistory])

  // ── Initial history load ─────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(fetchHistory, 0)
    return () => {
      clearTimeout(timer)
      closeWs()
      stopPolling()
    }
  }, [fetchHistory, closeWs, stopPolling])

  // ── Connect WebSocket when processing starts ────────────────────────────────
  useEffect(() => {
    if (activeDocument && processingStatus === 'processing') {
      connectWs(activeDocument)
    }
    return () => {
      closeWs()
      stopPolling()
    }
  }, [activeDocument, processingStatus, connectWs, closeWs, stopPolling])

  // ── Upload Handler ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    closeWs()
    stopPolling()
    setGraphData(null)
    setErrorMessage('')
    setProcessingStatus('uploading')
    setStatusMessage('Uploading document...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`, { method: 'POST', headers: authHeaders(), body: formData })
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)

      const data = await res.json()
      const documentId: string = data.document_id || data.documentId
      if (!documentId) throw new Error('No document ID returned from server.')

      setActiveDocument(documentId)
      setProcessingStatus('processing')
      setStatusMessage('Extracting knowledge graph & AI insights...')
      await fetchHistory()
    } catch (err) {
      setProcessingStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.')
    }
  }

  // ── Load a historical document ───────────────────────────────────────────────
  const handleSelectDocument = async (doc: DocumentRecord) => {
    closeWs()
    stopPolling()
    setGraphData(null)
    setDocumentUrl(null)
    setErrorMessage('')
    setActiveDocument(doc.id)

    // Fetch document URL for PDF viewer
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/document/${doc.id}/status`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        if (data.file_path) setDocumentUrl(data.file_path)
      }
    } catch (e) {
      console.warn('Failed to fetch document URL:', e)
    }

    if (doc.status === 'completed') {
      setProcessingStatus('processing')
      setStatusMessage('Loading graph...')
      await fetchGraph(doc.id)
    } else if (doc.status === 'failed') {
      setProcessingStatus('failed')
      setErrorMessage(doc.error_message || 'Processing failed.')
      setStatusMessage('Document processing failed.')
    } else {
      setProcessingStatus('processing')
      setStatusMessage('Extracting knowledge graph & AI insights...')
    }
  }

  const isBusy = processingStatus === 'uploading' || processingStatus === 'processing'
  const hasError = processingStatus === 'failed' || processingStatus === 'error'

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-text font-sans">

      {/* ── Mobile Overlay ─────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── History Sidebar ─────────────────────────────────────────────────── */}
      <div className={`fixed md:relative z-40 flex flex-col bg-secondary/40 border-r border-gray-800 transition-all duration-300 h-full ${
        sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:overflow-hidden'
      }`}>
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-cta mr-2 shrink-0" />
            <span className="font-mono text-xs font-semibold tracking-wider text-gray-300 truncate">DOCUMENT HISTORY</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-gray-400 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {historyLoading && <DocumentListSkeleton />}
          {!historyLoading && history.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-8 px-2">No documents yet. Upload a PDF to get started.</p>
          )}
          {history.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                handleSelectDocument(doc)
                if (window.innerWidth < 768) setSidebarOpen(false)
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${
                activeDocument === doc.id
                  ? 'bg-cta/10 border border-cta/30'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-gray-300 font-medium truncate flex-1">{doc.title}</p>
                <StatusBadge status={doc.status} />
              </div>
              {doc.created_at && (
                <p className="text-[10px] text-gray-600 mt-1">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sidebar Toggle (desktop only) ──────────────────────────────────── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hidden md:flex absolute top-1/2 z-20 -translate-y-1/2 w-5 h-10 bg-secondary border border-gray-700 rounded-r-md items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all cursor-pointer"
        style={{ left: sidebarOpen ? '256px' : '0px' }}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ── Icon Sidebar (hidden on mobile) ─────────────────────────────────── */}
      <div className="hidden md:flex w-16 flex-col items-center py-6 bg-secondary/50 border-r border-gray-800 shrink-0 gap-8 z-10">
        <div className="w-10 h-10 rounded-xl bg-cta flex items-center justify-center text-white font-bold shadow-lg shadow-cta/20">
          O
        </div>
        <div className="flex flex-col gap-4 mt-4">
          <button className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer">
            <Activity className="w-6 h-6" />
          </button>
          <button className="p-3 text-white bg-white/10 rounded-xl shadow-inner transition-all cursor-pointer">
            <Network className="w-6 h-6" />
          </button>
        </div>
        <div className="mt-auto">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Bar ────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-20 flex items-center justify-around py-2 bg-secondary/90 border-t border-gray-800 backdrop-blur">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-400 hover:text-white cursor-pointer"
        >
          <Clock className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-400 hover:text-white cursor-pointer">
          <Activity className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-cta flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-cta/20">
          O
        </div>
        <button className="p-2 text-white bg-white/10 rounded-lg cursor-pointer">
          <Network className="w-5 h-5" />
        </button>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-gray-400 hover:text-white cursor-pointer"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* ── Main Split ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-w-0 pb-14 md:pb-0">

        {/* ── Left: Document Viewer ── */}
        <div className="flex-1 border-r border-gray-800 flex flex-col bg-background/50 min-w-0">
          <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-secondary/30 shrink-0">
            <h2 className="font-mono text-sm font-semibold tracking-wider text-gray-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cta" /> DOCUMENT VIEWER
            </h2>
            <div className="flex gap-3">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-gray-700 border border-gray-700 rounded-lg text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingStatus === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {processingStatus === 'uploading' ? 'UPLOADING...' : 'UPLOAD PDF'}
              </button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-hidden">
            {activeDocument && documentUrl ? (
              <div className="w-full h-full min-h-[400px] border border-gray-800 rounded-xl bg-secondary/20 shadow-inner overflow-hidden">
                <PdfViewer url={documentUrl} />
              </div>
            ) : activeDocument ? (
              <div className="w-full h-full min-h-[400px] border border-gray-800 rounded-xl bg-secondary/20 shadow-inner flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-gray-600 mx-auto mb-4 animate-spin" />
                  <p className="text-xs text-gray-600 font-mono">Loading document...</p>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full min-h-[400px] border border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-gray-500 hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <Upload className="w-12 h-12 mb-4 text-gray-600" />
                <p>No document selected</p>
                <p className="text-sm mt-1">Click or upload a PDF to begin</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Intelligence Panel (Graph + Chat split vertically) ── */}
        <div className="flex-1 flex flex-col bg-background/50 min-w-0 overflow-hidden">

          {/* ── Graph Section (top 60%, 50% on mobile) ── */}
          <div className="flex flex-col h-[50%] md:h-[60%]">
            <div className="h-14 border-b border-gray-800 flex items-center px-6 bg-secondary/30 shrink-0">
              <h2 className="font-mono text-sm font-semibold tracking-wider text-gray-300 flex items-center gap-2">
                <Network className="w-4 h-4 text-cta" /> INTELLIGENCE GRAPH
              </h2>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden min-h-0">

              {/* Error Banner (Failed) */}
              {processingStatus === 'failed' && (
                <div className="p-3 rounded-xl bg-red-900/20 border border-red-700 flex items-start gap-3 shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-300">Processing Failed</p>
                    <p className="text-xs text-red-400/80 mt-1">{errorMessage}</p>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-900/40 hover:bg-red-900/60 border border-red-700 rounded-lg text-red-300 transition-all cursor-pointer"
                  >
                    <Key className="w-3 h-3" /> Fix API Key
                  </button>
                </div>
              )}

              {/* Status Bar */}
              <div className={`flex items-center gap-4 p-3 rounded-xl border transition-colors shrink-0 ${
                hasError ? 'bg-red-900/20 border-red-800' : 'bg-secondary/30 border-gray-800'
              }`}>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-300">Processing Status</h4>
                  <div className={`text-xs mt-0.5 ${hasError ? 'text-red-400' : 'text-gray-500'}`}>
                    {hasError && processingStatus !== 'failed' ? errorMessage : statusMessage}
                  </div>
                </div>
                <div className="shrink-0"><StatusIcon status={processingStatus} /></div>
              </div>

              {/* Graph Visualization */}
              <div className="flex-1 border border-gray-800 rounded-xl bg-[#0B1120] relative overflow-hidden min-h-0">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                {processingStatus === 'completed' && graphData ? (
                  <div className="absolute inset-0">
                    <ErrorBoundary label="Knowledge Graph">
                      <KnowledgeGraph graphData={graphData} />
                    </ErrorBoundary>
                  </div>
                ) : isBusy ? (
                  <GraphSkeleton />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                    <Network className="w-12 h-12 mb-3 opacity-50" />
                    <p className="font-mono text-xs uppercase tracking-widest">
                      {hasError ? 'Processing Failed' : 'Waiting for Data'}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Chat Section (bottom 40%) ── */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ErrorBoundary label="Chat">
              <ChatPanel />
            </ErrorBoundary>
          </div>

        </div>
      </div>

      <ApiKeyModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
