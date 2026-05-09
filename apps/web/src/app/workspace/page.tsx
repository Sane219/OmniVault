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

const POLL_INTERVAL_MS = 2000

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed' | 'error'

interface DocumentRecord {
  id: string
  title: string
  status: string
  error_message?: string
  created_at?: string
}

// ── Auth header helper ────────────────────────────────────────────────────────
function authHeaders(): HeadersInit {
  // Pull token from the cookie so we can forward it as Bearer
  const match = document.cookie.match(/omnivault_token=([^;]+)/)
  const token = match ? match[1] : ''
  return token ? { Authorization: `Bearer ${token}` } : {}
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

  const [history, setHistory] = useState<DocumentRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/documents', { headers: authHeaders() })
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
      const res = await fetch(`/api/document/${documentId}/graph`, { headers: authHeaders() })
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

  const startPolling = useCallback((documentId: string) => {
    stopPolling()
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/document/${documentId}/status`, { headers: authHeaders() })
        if (!res.ok) throw new Error(`Status check failed (${res.status})`)
        const data = await res.json()

        if (data.status === 'completed') {
          stopPolling()
          await fetchGraph(documentId)
        } else if (data.status === 'failed') {
          stopPolling()
          setProcessingStatus('failed')
          setErrorMessage(data.error_message || 'Processing failed. Please check your API key.')
          await fetchHistory()
        }
        // 'processing' or 'uploaded' → keep polling
      } catch (err) {
        stopPolling()
        setProcessingStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Polling failed.')
      }
    }, POLL_INTERVAL_MS)
  }, [stopPolling, fetchGraph, fetchHistory])

  // ── Initial history load ─────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(fetchHistory, 0)
    return () => {
      clearTimeout(timer)
      stopPolling()
    }
  }, [fetchHistory, stopPolling])

  // ── Kick off polling when activeDocument + status changes ────────────────────
  useEffect(() => {
    if (activeDocument && processingStatus === 'processing') {
      startPolling(activeDocument)
    }
  }, [activeDocument, processingStatus, startPolling])

  // ── Upload Handler ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    stopPolling()
    setGraphData(null)
    setErrorMessage('')
    setProcessingStatus('uploading')
    setStatusMessage('Uploading document...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: authHeaders(), body: formData })
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
    stopPolling()
    setGraphData(null)
    setErrorMessage('')
    setActiveDocument(doc.id)

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

      {/* ── History Sidebar ─────────────────────────────────────────────────── */}
      <div className={`relative flex flex-col bg-secondary/40 border-r border-gray-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="h-14 border-b border-gray-800 flex items-center px-4 shrink-0">
          <Clock className="w-4 h-4 text-cta mr-2 shrink-0" />
          <span className="font-mono text-xs font-semibold tracking-wider text-gray-300 truncate">DOCUMENT HISTORY</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {historyLoading && (
            <div className="flex items-center justify-center py-8 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {!historyLoading && history.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-8 px-2">No documents yet. Upload a PDF to get started.</p>
          )}
          {history.map((doc) => (
            <button
              key={doc.id}
              onClick={() => handleSelectDocument(doc)}
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

      {/* ── Sidebar Toggle ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-1/2 z-20 -translate-y-1/2 w-5 h-10 bg-secondary border border-gray-700 rounded-r-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all cursor-pointer"
        style={{ left: sidebarOpen ? '256px' : '0px' }}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ── Icon Sidebar ────────────────────────────────────────────────────── */}
      <div className="w-16 flex flex-col items-center py-6 bg-secondary/50 border-r border-gray-800 shrink-0 gap-8 z-10">
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

      {/* ── Main Split ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-w-0">

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
          <div className="flex-1 p-6 overflow-y-auto">
            {activeDocument ? (
              <div className="w-full h-full min-h-[400px] border border-gray-800 rounded-xl bg-secondary/20 shadow-inner flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-sm font-mono font-medium text-gray-400 break-all max-w-xs px-4">{activeDocument}</h3>
                  <p className="text-xs text-gray-600 mt-2">PDF Viewer Placeholder</p>
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

          {/* ── Graph Section (top 60%) ── */}
          <div className="flex flex-col" style={{ height: '60%' }}>
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
                    <KnowledgeGraph graphData={graphData} />
                  </div>
                ) : isBusy ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-2 border-cta/30 animate-ping" />
                      <div className="absolute inset-2 rounded-full border-2 border-cta/60 animate-ping" style={{ animationDelay: '300ms' }} />
                      <div className="absolute inset-3 rounded-full border-2 border-cta animate-ping" style={{ animationDelay: '600ms' }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Network className="w-6 h-6 text-cta" />
                      </div>
                    </div>
                    <p className="font-mono text-xs text-cta/80 tracking-widest uppercase animate-pulse">Processing Document...</p>
                  </div>
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
            <ChatPanel />
          </div>

        </div>
      </div>

      <ApiKeyModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
