"use client"
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { Lock, Mail, Shield, User } from 'lucide-react'

interface AuthDialogProps {
  mode: 'login' | 'register'
  onSwitch: () => void
}

export function AuthDialog({ mode, onSwitch }: AuthDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { setAccessToken, setUserEmail } = useStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const endpoint = mode === 'login' ? '/login' : '/register'
    const body = mode === 'login'
      ? { email, password }
      : { name, email, password }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(mode === 'login' ? 'Login failed' : 'Registration failed')

      if (mode === 'login') {
        const data = await res.json()
        const token = data.access_token
        setAccessToken(token)
        setUserEmail(email)
        document.cookie = `omnivault_token=${token}; path=/; max-age=86400; SameSite=Strict`
      } else {
        onSwitch() // switch to login after register
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-terminal bg-matrix-green/10 border border-matrix-green flex items-center justify-center shadow-neon">
          <Shield className="w-5 h-5 text-matrix-green" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-bright font-mono uppercase tracking-widest">OmniVault</h2>
          <p className="text-[10px] text-dim font-mono tracking-wider">
            {mode === 'login' ? 'AUTHENTICATE TO CONTINUE' : 'CREATE ACCESS CREDENTIALS'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label className="text-[10px] font-mono text-dim uppercase tracking-wider mb-1 block">Operator Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="agent_name"
                className="neon-input w-full pl-10 pr-4 py-2.5 text-sm font-mono"
                required
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-mono text-dim uppercase tracking-wider mb-1 block">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@matrix.net"
              className="neon-input w-full pl-10 pr-4 py-2.5 text-sm font-mono"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono text-dim uppercase tracking-wider mb-1 block">Passphrase</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="neon-input w-full pl-10 pr-4 py-2.5 text-sm font-mono"
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-alert font-mono">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-neon w-full py-3 text-xs"
        >
          {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'AUTHENTICATE' : 'REGISTER'}
        </button>
      </form>

      <p className="text-center text-[11px] text-dim font-mono mt-4">
        {mode === 'login' ? 'No credentials? ' : 'Already registered? '}
        <button
          onClick={onSwitch}
          className="text-matrix-green hover:text-bright cursor-pointer transition-colors"
        >
          {mode === 'login' ? 'Register' : 'Login'}
        </button>
      </p>
    </div>
  )
}
