"use client"
import { useState } from 'react'
import { Key, X } from 'lucide-react'

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')

    try {
      const match = document.cookie.match(/omnivault_token=([^;]+)/)
      const token = match ? match[1] : ''

      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/api-key`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ api_key: apiKey })
      })

      if (!res.ok) throw new Error('Failed to save API key')

      setStatus('success')
      setTimeout(() => {
        onClose()
        setStatus('idle')
      }, 1500)
    } catch (err) {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/90 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 neon-panel-elevated crt-scanlines">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-dim hover:text-matrix-green cursor-pointer transition-colors hover-glitch">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-matrix-green-faint rounded-terminal text-matrix-green border border-matrix-green-dim">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-mono font-bold uppercase tracking-[0.08em] text-text-bright">API KEY</h3>
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-dim">gemini configuration</p>
          </div>
        </div>

        {status === 'success' && (
          <div className="mb-4 p-3 bg-matrix-green-faint border border-matrix-green-dim text-matrix-green rounded-terminal text-sm font-mono">
            key configured successfully.
          </div>
        )}
        {status === 'error' && (
          <div className="mb-4 p-3 bg-red-alert/10 border border-red-alert/30 text-red-alert rounded-terminal text-sm font-mono">
            failed to save key. retry.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <p className="text-sm text-text-normal mb-4">
            Enter your Google Gemini API key to enable document intelligence and summarization.
          </p>
          <div className="mb-4">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="neon-input block w-full px-3 py-2.5 text-sm font-mono"
              placeholder="AIzaSy..."
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-neon"
            >
              {loading ? 'SAVING...' : 'SAVE KEY'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
