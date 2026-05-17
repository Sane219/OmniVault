"use client"
import { useRef, useCallback, useEffect } from 'react'
import { useStore, type DocumentRecord } from '../store/useStore'
import { authHeaders } from './auth'

// Module-level singletons — shared across all hook instances
let wsRef: WebSocket | null = null
let pollIntervalRef: ReturnType<typeof setInterval> | null = null
let consumerCount = 0

function closeWs() {
  if (wsRef) {
    wsRef.close()
    wsRef = null
  }
}

function stopPolling() {
  if (pollIntervalRef) {
    clearInterval(pollIntervalRef)
    pollIntervalRef = null
  }
}

export function useDocumentManager() {
  const store = useStore()
  const {
    activeDocument, setActiveDocument,
    processingStatus, setProcessingStatus,
    statusMessage, setStatusMessage,
    errorMessage, setErrorMessage,
    graphData, setGraphData,
    documentUrl, setDocumentUrl,
    history, setHistory,
    historyLoading, setHistoryLoading,
  } = store

  const fileInputRef = useRef<HTMLInputElement>(null)

  const isBusy = processingStatus === 'uploading' || processingStatus === 'processing'
  const hasError = processingStatus === 'failed' || processingStatus === 'error'

  // ── Fetchers ────────────────────────────────────────────────────────────
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
  }, [setHistory, setHistoryLoading])

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
  }, [setGraphData, setProcessingStatus, setStatusMessage, setErrorMessage, fetchHistory])

  const startPollingFallback = useCallback((documentId: string) => {
    stopPolling()
    pollIntervalRef = setInterval(async () => {
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
  }, [setDocumentUrl, setProcessingStatus, setErrorMessage, fetchGraph, fetchHistory])

  const connectWs = useCallback((documentId: string) => {
    closeWs()
    const token = document.cookie.match(/omnivault_token=([^;]+)/)?.[1]
    if (!token) return

    const wsUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080')
      .replace(/^http/, 'ws') + `/ws/document?id=${documentId}&token=${token}`

    const ws = new WebSocket(wsUrl)
    wsRef = ws

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

    ws.onclose = () => { wsRef = null }
  }, [setDocumentUrl, setProcessingStatus, setStatusMessage, setErrorMessage, fetchGraph, fetchHistory, startPollingFallback])

  // ── Effects (ref-counted so closing one window doesn't kill shared WS) ───
  useEffect(() => {
    consumerCount++
    const timer = setTimeout(fetchHistory, 0)
    return () => {
      clearTimeout(timer)
      consumerCount--
      if (consumerCount === 0) {
        closeWs()
        stopPolling()
      }
    }
  }, [fetchHistory])

  useEffect(() => {
    if (activeDocument && processingStatus === 'processing') {
      connectWs(activeDocument)
    }
    return () => {
      if (consumerCount === 0) {
        closeWs()
        stopPolling()
      }
    }
  }, [activeDocument, processingStatus, connectWs])

  // ── Upload ──────────────────────────────────────────────────────────────
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      })
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

  // ── Select Document ─────────────────────────────────────────────────────
  const handleSelectDocument = useCallback(async (doc: DocumentRecord) => {
    closeWs()
    stopPolling()
    setActiveDocument(doc.id)
    setGraphData(null)
    setDocumentUrl(null)
    setErrorMessage('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/document/${doc.id}/status`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to fetch document status')
      const data = await res.json()

      if (data.file_path) setDocumentUrl(data.file_path)

      if (data.status === 'completed') {
        setProcessingStatus('processing')
        setStatusMessage('Loading graph...')
        await fetchGraph(doc.id)
      } else if (data.status === 'failed') {
        setProcessingStatus('failed')
        setErrorMessage(data.error_message || 'Processing failed.')
      } else {
        setProcessingStatus('processing')
        setStatusMessage(data.message || 'Processing...')
        connectWs(doc.id)
      }
    } catch (err) {
      setProcessingStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load document.')
    }
  }, [setActiveDocument, setGraphData, setDocumentUrl, setErrorMessage, setProcessingStatus, setStatusMessage, fetchGraph, connectWs])

  return {
    activeDocument,
    processingStatus,
    statusMessage,
    errorMessage,
    graphData,
    documentUrl,
    history,
    historyLoading,
    fileInputRef,
    isBusy,
    hasError,
    handleFileUpload,
    handleSelectDocument,
  }
}
