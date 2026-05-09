"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, FileText, Settings, Activity, Network, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { ApiKeyModal } from '../../components/ApiKeyModal'
import { KnowledgeGraph } from '../../components/KnowledgeGraph'

const POLL_INTERVAL_MS = 2000

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error'

function StatusIcon({ status }: { status: ProcessingStatus }) {
  if (status === 'idle') return <div className="w-3 h-3 rounded-full bg-gray-600" />
  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-cta animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-cta animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-cta animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    )
  }
  if (status === 'completed') return <CheckCircle2 className="w-6 h-6 text-cta" />
  if (status === 'error') return <AlertCircle className="w-6 h-6 text-red-400" />
  return null
}

export default function WorkspacePage() {
  const { activeDocument, setActiveDocument } = useStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('Awaiting document upload...')
  const [graphData, setGraphData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Stop Polling Helper ────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // ─── Fetch final graph data ─────────────────────────────────────────────────
  const fetchGraph = useCallback(async (documentId: string) => {
    try {
      const res = await fetch(`/api/document/${documentId}/graph`)
      if (!res.ok) throw new Error(`Failed to fetch graph (${res.status})`)
      const data = await res.json()
      setGraphData(data)
      setProcessingStatus('completed')
      setStatusMessage('Processing complete. Knowledge graph generated.')
    } catch (err) {
      setProcessingStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load graph data.')
    }
  }, [])

  // ─── Start Polling for document status ─────────────────────────────────────
  const startPolling = useCallback((documentId: string) => {
    stopPolling()

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/document/${documentId}/status`)
        if (!res.ok) throw new Error(`Status check failed (${res.status})`)
        const data = await res.json()

        if (data.status === 'completed') {
          stopPolling()
          await fetchGraph(documentId)
        }
        // If still 'processing', keep polling
      } catch (err) {
        stopPolling()
        setProcessingStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Polling failed.')
      }
    }, POLL_INTERVAL_MS)
  }, [stopPolling, fetchGraph])

  // ─── Clean up polling on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // ─── Start polling whenever activeDocument changes ──────────────────────────
  useEffect(() => {
    if (activeDocument && processingStatus === 'processing') {
      startPolling(activeDocument)
    }
  }, [activeDocument, processingStatus, startPolling])

  // ─── File Upload Handler ────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset state for the new document
    stopPolling()
    setGraphData(null)
    setErrorMessage('')
    setProcessingStatus('uploading')
    setStatusMessage('Uploading document...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error(`Upload failed (${res.status})`)

      const data = await res.json()
      const documentId: string = data.document_id || data.documentId

      if (!documentId) throw new Error('No document ID returned from server.')

      setActiveDocument(documentId)
      setProcessingStatus('processing')
      setStatusMessage('Extracting knowledge graph & AI insights...')

      // startPolling is kicked off by the useEffect watching activeDocument + processingStatus
    } catch (err) {
      setProcessingStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.')
    }
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-text font-sans">

      {/* ── Sidebar ──────────────────────────────────────────────── */}
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

      {/* ── Main Split ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Panel: Document Viewer ── */}
        <div className="flex-1 border-r border-gray-800 flex flex-col bg-background/50">
          <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-secondary/30">
            <h2 className="font-mono text-sm font-semibold tracking-wider text-gray-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cta" /> DOCUMENT VIEWER
            </h2>
            <div className="flex gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="application/pdf"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processingStatus === 'uploading' || processingStatus === 'processing'}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-gray-700 border border-gray-700 rounded-lg text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingStatus === 'uploading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
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
                  <h3 className="text-lg font-medium text-gray-300 font-mono break-all max-w-xs">{activeDocument}</h3>
                  <p className="text-sm text-gray-500 mt-2">PDF Viewer Placeholder</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full min-h-[400px] border border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-gray-500 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-12 h-12 mb-4 text-gray-600" />
                <p>No document selected</p>
                <p className="text-sm mt-1">Click or upload a PDF to begin</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Intelligence Graph ── */}
        <div className="flex-1 flex flex-col bg-background/50">
          <div className="h-14 border-b border-gray-800 flex items-center px-6 bg-secondary/30">
            <h2 className="font-mono text-sm font-semibold tracking-wider text-gray-300 flex items-center gap-2">
              <Network className="w-4 h-4 text-cta" /> INTELLIGENCE GRAPH
            </h2>
          </div>

          <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">

            {/* Status Bar */}
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
              processingStatus === 'error'
                ? 'bg-red-900/20 border-red-800'
                : 'bg-secondary/30 border-gray-800'
            }`}>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-300">Processing Status</h4>
                <div className={`text-xs mt-1 ${processingStatus === 'error' ? 'text-red-400' : 'text-gray-500'}`}>
                  {processingStatus === 'error' ? errorMessage : statusMessage}
                </div>
              </div>
              <div className="shrink-0">
                <StatusIcon status={processingStatus} />
              </div>
            </div>

            {/* Graph Visualization */}
            <div className="flex-1 border border-gray-800 rounded-xl bg-[#0B1120] relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

              {processingStatus === 'completed' && graphData ? (
                <div className="absolute inset-0">
                  <KnowledgeGraph graphData={graphData} />
                </div>
              ) : processingStatus === 'processing' || processingStatus === 'uploading' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-2 border-cta/30 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-cta/60 animate-ping" style={{ animationDelay: '300ms' }} />
                    <div className="absolute inset-4 rounded-full border-2 border-cta animate-ping" style={{ animationDelay: '600ms' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Network className="w-7 h-7 text-cta" />
                    </div>
                  </div>
                  <p className="font-mono text-sm text-cta/80 tracking-widest uppercase animate-pulse">
                    Processing Document...
                  </p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 z-10">
                  <Network className="w-16 h-16 mb-4 opacity-50" />
                  <p className="font-mono text-sm uppercase tracking-widest">Waiting for Data</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <ApiKeyModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
