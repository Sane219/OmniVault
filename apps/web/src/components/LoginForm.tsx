"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '../store/useStore'
import { Lock, Mail, Shield } from 'lucide-react'
import Link from 'next/link'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { setAccessToken, setUserEmail } = useStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        throw new Error('Login failed')
      }

      const data = await res.json()
      const token = data.access_token

      setAccessToken(token)
      setUserEmail(email)

      document.cookie = `omnivault_token=${token}; path=/; max-age=86400; SameSite=Strict`

      router.push('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md p-8 neon-panel-elevated crt-scanlines rounded-terminal relative z-10">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-terminal bg-matrix-green/10 border border-matrix-green flex items-center justify-center shadow-neon">
          <Shield className="w-5 h-5 text-matrix-green" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-bright font-mono uppercase tracking-widest">OmniVault</h2>
          <p className="text-xs text-dim font-mono tracking-wider">TERMINAL ACCESS</p>
        </div>
      </div>

      <p className="text-text-normal text-sm mb-6">Enter your credentials to continue.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-alert/10 border border-red-alert/30 text-red-alert rounded-terminal text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-normal mb-1.5">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-dim" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="neon-input block w-full pl-10 pr-3 py-2.5 text-sm"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-normal mb-1.5">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-dim" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="neon-input block w-full pl-10 pr-3 py-2.5 text-sm"
              placeholder="••••••••"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-neon w-full mt-6"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-dim">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-matrix-green hover:text-bright transition-colors duration-100">
          Create one
        </Link>
      </p>
    </div>
  )
}
