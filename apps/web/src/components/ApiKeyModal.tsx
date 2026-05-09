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
      const res = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 bg-secondary border border-gray-700 rounded-xl shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400">
            <Key className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-mono text-white">Gemini API Key</h3>
        </div>
        
        {status === 'success' && <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 text-green-200 rounded text-sm">API Key configured successfully.</div>}
        {status === 'error' && <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded text-sm">Failed to save API Key. Please try again.</div>}
        
        <form onSubmit={handleSubmit}>
          <p className="text-sm text-gray-400 mb-4">
            Enter your Google Gemini API key to enable document intelligence and summarization features.
          </p>
          <div className="mb-4">
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-700 rounded-md leading-5 bg-background text-gray-300 placeholder-gray-500 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta sm:text-sm transition-colors duration-200"
              placeholder="AIzaSy..."
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cta hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cta focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
