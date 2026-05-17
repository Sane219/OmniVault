"use client"
import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { BootSequence } from '../components/os/BootSequence'
import { Desktop } from '../components/os/Desktop'
import { AuthDialog } from '../components/os/AuthDialog'

export default function HomePage() {
  const { accessToken, booted, setBootComplete } = useStore()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const showAuth = booted && !accessToken

  // Check for existing token on mount
  useEffect(() => {
    const token = document.cookie.match(/omnivault_token=([^;]+)/)?.[1]
    if (token) {
      useStore.getState().setAccessToken(token)
    }
  }, [])

  return (
    <>
      {/* Boot Sequence */}
      {!booted && (
        <BootSequence onComplete={setBootComplete} />
      )}

      {/* Desktop */}
      {booted && <Desktop />}

      {/* Auth Overlay — OS dialog on top of desktop */}
      {showAuth && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />

          {/* Dialog Window */}
          <div className="os-window relative z-10 w-full max-w-sm mx-4">
            <div className="os-window-titlebar">
              <div className="flex gap-1.5">
                <div className="os-window-btn os-window-btn-close" />
                <div className="os-window-btn os-window-btn-minimize" />
                <div className="os-window-btn os-window-btn-maximize" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-[11px] font-mono uppercase tracking-widest text-text-dim">
                  System Authentication
                </span>
              </div>
              <div className="w-12" />
            </div>
            <div className="p-6">
              <AuthDialog
                mode={authMode}
                onSwitch={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
