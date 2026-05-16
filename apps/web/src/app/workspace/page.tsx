"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Upload, FileText, Settings, Activity, Network,
  CheckCircle2, AlertCircle, Loader2, ChevronLeft,
  ChevronRight, Clock, Key, Shield
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
    uploaded: 'text-text-dim',
    processing: 'text-amber border border-amber/30',
    completed: 'text-matrix-green border border-matrix-green/30',
    failed: 'text-red-alert border border-red-alert/30',
  }
  return (
    <span className={`neon-badge ${map[status] ?? 'text-text-dim'}`}>
      {status.toUpperCase()}
    </span>
  )
}

// ── Status Icon ─────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: ProcessingStatus }) {
  if (status === 'idle') return <div className="w-3 h-3 rounded-full bg-matrix-green-dim" />
  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="flex gap-1 animate-glow-pulse">
        {[0, 150, 300].map((delay) => (
          <div key={delay} className="w-2 h-2 rounded-full bg-matrix-green shadow-neon" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    )
  }
  if (status === 'completed') return <CheckCircle2 className="w-6 h-6 text-matrix-green" />
  if (status === 'failed' || status === 'error') return <AlertCircle className="w-6 h-6 text-red-alert shadow-neon-red" />
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
      console.warn('WebSocket failed, falling back to polling')
      startPollingFallback(documentId)
    }

    ws.onclose = () => {
      wsRef.current = null
    }
  }, [closeWs, fetchGraph, fetchHistory, startPollingFallback])

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
    <div className="flex h-screen w-full bg-void overflow-hidden text-text-normal font-sans relative">
      {/* Ambient orbs — matrix green at very low opacity */}
      <div className="orb w-[500px] h-[500px] bg-matrix-green/[0.04] top-[-150px] right-[-100px]" />
      <div className="orb w-[300px] h-[300px] bg-matrix-green/[0.02] bottom-[100px] left-[200px]" />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* History Sidebar */}
      <div className={`fixed md:relative z-40 flex flex-col bg-terminal border-r border-panel-border transition-all duration-300 h-full ${
        sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:overflow-hidden'
      }`}>
        <div className="h-14 border-b border-panel-border flex items-center justify-between px-4 shrink-0">
          <div className="section-line">
            <Clock className="w-4 h-4 text-matrix-green shrink-0" />
            <span className="font-mono text-xs font-semibold tracking-widest text-text-bright truncate uppercase">Document History</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-text-dim hover:text-matrix-green cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {historyLoading && <DocumentListSkeleton />}
          {!historyLoading && history.length === 0 && (
            <p className="text-xs text-text-dim text-center py-8 px-2 font-mono">No documents yet. Upload a PDF to get started.</p>
          )}
          {history.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                handleSelectDocument(doc)
                if (window.innerWidth < 768) setSidebarOpen(false)
              }}
              className={`w-full text-left px-3 py-2.5 rounded-panel transition-all cursor-pointer group hover-glitch ${
                activeDocument === doc.id
                  ? 'bg-matrix-green-faint border border-panel-border-hover'
                  : 'hover:bg-panel-hover border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-text-normal font-medium truncate flex-1">{doc.title}</p>
                <StatusBadge status={doc.status} />
              </div>
              {doc.created_at && (
                <p className="text-[10px] text-text-dim mt-1 font-mono">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar Toggle (desktop only) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hidden md:flex absolute top-1/2 z-20 -translate-y-1/2 w-5 h-10 bg-terminal border border-panel-border rounded-r-terminal items-center justify-center text-text-dim hover:text-matrix-green hover:border-panel-border-hover transition-all cursor-pointer"
        style={{ left: sidebarOpen ? '256px' : '0px' }}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Icon Sidebar (hidden on mobile) */}
      <div className="hidden md:flex w-16 flex-col items-center py-6 bg-terminal border-r border-panel-border shrink-0 gap-8 z-10">
        <div className="w-10 h-10 rounded-panel bg-matrix-green-faint border border-panel-border flex items-center justify-center shadow-neon">
          <Shield className="w-5 h-5 text-matrix-green" />
        </div>
        <div className="flex flex-col gap-4 mt-4">
          <button className="p-3 text-text-dim hover:text-matrix-green hover:bg-matrix-green-faint rounded-panel transition-all cursor-pointer hover-glitch">
            <Activity className="w-5 h-5" />
          </button>
          <button className="p-3 text-matrix-green bg-matrix-green-faint rounded-panel border border-panel-border-hover transition-all cursor-pointer">
            <Network className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-auto">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 text-text-dim hover:text-matrix-green hover:bg-matrix-green-faint rounded-panel transition-all cursor-pointer hover-glitch"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-20 flex items-center justify-around py-2 bg-terminal border-t border-panel-border">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-text-dim hover:text-matrix-green cursor-pointer transition-colors"
        >
          <Clock className="w-5 h-5" />
        </button>
        <button className="p-2 text-text-dim hover:text-matrix-green cursor-pointer transition-colors">
          <Activity className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-terminal bg-matrix-green-faint border border-panel-border flex items-center justify-center shadow-neon">
          <Shield className="w-4 h-4 text-matrix-green" />
        </div>
        <button className="p-2 text-matrix-green bg-matrix-green-faint rounded-terminal border border-panel-border-hover cursor-pointer">
          <Network className="w-5 h-5" />
        </button>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-text-dim hover:text-matrix-green cursor-pointer transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Main Split */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-w-0 pb-14 md:pb-0 relative z-10">

        {/* Left: Document Viewer */}
        <div className="flex-1 border-r border-panel-border flex flex-col min-w-0">
          <div className="h-14 border-b border-panel-border flex items-center justify-between px-6 bg-terminal shrink-0">
            <h2 className="section-line font-mono text-sm font-semibold tracking-widest text-text-bright flex items-center gap-2 uppercase">
              <FileText className="w-4 h-4 text-matrix-green" /> Document Viewer
            </h2>
            <div className="flex gap-3">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="btn-neon flex items-center gap-2"
              >
                {processingStatus === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {processingStatus === 'uploading' ? 'UPLOADING...' : 'UPLOAD PDF'}
              </button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-hidden">
            {activeDocument && documentUrl ? (
              <div className="w-full h-full min-h-[400px] neon-panel overflow-hidden">
                <PdfViewer url={documentUrl} />
              </div>
            ) : activeDocument ? (
              <div className="w-full h-full min-h-[400px] neon-panel flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-matrix-green/[0.02] to-transparent pointer-events-none" />
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-matrix-green-dim mx-auto mb-4 animate-spin" />
                  <p className="text-xs text-text-dim font-mono">Loading document...</p>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full min-h-[400px] border-2 border-dashed border-matrix-green-dim rounded-panel flex flex-col items-center justify-center text-text-dim hover:border-matrix-green hover:shadow-neon hover:bg-matrix-green-faint transition-all cursor-pointer hover-glitch group"
              >
                <div className="w-16 h-16 rounded-panel bg-matrix-green-faint border border-panel-border flex items-center justify-center mb-4 group-hover:border-panel-border-hover group-hover:shadow-neon transition-all">
                  <Upload className="w-8 h-8 text-matrix-green-dim group-hover:text-matrix-green transition-colors" />
                </div>
                <p className="text-text-normal font-medium">No document selected</p>
                <p className="text-sm mt-1 text-text-dim font-mono">Click or upload a PDF to begin</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Intelligence Panel (Graph + Chat split vertically) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Graph Section (top 60%, 50% on mobile) */}
          <div className="flex flex-col h-[50%] md:h-[60%]">
            <div className="h-14 border-b border-panel-border flex items-center px-6 bg-terminal shrink-0">
              <h2 className="section-line font-mono text-sm font-semibold tracking-widest text-text-bright flex items-center gap-2 uppercase">
                <Network className="w-4 h-4 text-matrix-green" /> Intelligence Graph
              </h2>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden min-h-0">

              {/* Error Banner (Failed) */}
              {processingStatus === 'failed' && (
                <div className="p-3 rounded-panel bg-red-alert/10 border border-red-alert/30 flex items-start gap-3 shrink-0 shadow-neon-red">
                  <AlertCircle className="w-5 h-5 text-red-alert shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-alert">Processing Failed</p>
                    <p className="text-xs text-red-alert/70 mt-1">{errorMessage}</p>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-alert/10 hover:bg-red-alert/20 border border-red-alert/30 rounded-terminal text-red-alert transition-all cursor-pointer"
                  >
                    <Key className="w-3 h-3" /> Fix API Key
                  </button>
                </div>
              )}

              {/* Status Bar */}
              <div className={`flex items-center gap-4 p-3 rounded-panel border transition-all shrink-0 ${
                hasError
                  ? 'bg-red-alert/10 border-red-alert/30 shadow-neon-red'
                  : isBusy
                    ? 'neon-panel animate-glow-pulse'
                    : 'neon-panel'
              }`}>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-text-bright font-mono tracking-wider uppercase">Processing Status</h4>
                  <div className={`text-xs mt-0.5 font-mono ${hasError ? 'text-red-alert' : 'text-text-dim'}`}>
                    {hasError && processingStatus !== 'failed' ? errorMessage : statusMessage}
                  </div>
                </div>
                <div className="shrink-0"><StatusIcon status={processingStatus} /></div>
              </div>

              {/* Graph Visualization */}
              <div className="flex-1 neon-panel relative overflow-hidden min-h-0 grid-bg">

                {processingStatus === 'completed' && graphData ? (
                  <div className="absolute inset-0">
                    <ErrorBoundary label="Knowledge Graph">
                      <KnowledgeGraph graphData={graphData} />
                    </ErrorBoundary>
                  </div>
                ) : isBusy ? (
                  <GraphSkeleton />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-text-dim">
                    <div className="w-16 h-16 rounded-panel bg-matrix-green-faint border border-panel-border flex items-center justify-center mb-3">
                      <Network className="w-8 h-8 text-matrix-green-dim" />
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
                      {hasError ? 'Processing Failed' : 'Waiting for Data'}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Chat Section (bottom 40%) */}
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
