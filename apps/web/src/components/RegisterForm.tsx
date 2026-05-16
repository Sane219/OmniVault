"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, User, Shield } from 'lucide-react'
import Link from 'next/link'

export function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })

      if (!res.ok) {
        throw new Error('Registration failed')
      }

      router.push('/login?registered=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
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
          <p className="text-xs text-dim font-mono tracking-wider">INITIALIZE ACCESS</p>
        </div>
      </div>

      <p className="text-text-normal text-sm mb-6">Create your secure access credentials.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-alert/10 border border-red-alert/30 text-red-alert rounded-terminal text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-normal mb-1.5">Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-dim" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="neon-input block w-full pl-10 pr-3 py-2.5 text-sm"
              placeholder="John Doe"
              required
            />
          </div>
        </div>
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
          {loading ? 'Initializing...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-dim">
        Already have access?{' '}
        <Link href="/login" className="text-matrix-green hover:text-bright transition-colors duration-100">
          Sign in
        </Link>
      </p>
    </div>
  )
}
