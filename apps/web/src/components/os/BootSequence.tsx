"use client"
import { useState, useEffect, useCallback } from 'react'

const BOOT_LINES = [
  { text: '[BOOT] OmniVault Kernel 6.1.0-matrix', delay: 0 },
  { text: '[OK]   Mounting /dev/knowledge...', delay: 200 },
  { text: '[OK]   Initializing quantum entropy pool', delay: 350 },
  { text: '[OK]   Loading AI subsystem v3.7.1', delay: 500 },
  { text: '[OK]   Neural mesh interface: ACTIVE', delay: 700 },
  { text: '[OK]   Connecting to document vault...', delay: 900 },
  { text: '[OK]   Knowledge graph engine: ONLINE', delay: 1100 },
  { text: '[OK]   Encryption layer: AES-256-GCM', delay: 1250 },
  { text: '[OK]   Session token: authenticated', delay: 1400 },
  { text: '', delay: 1500 },
  { text: '  ╔══════════════════════════════════════╗', delay: 1600 },
  { text: '  ║   O M N I V A U L T   T E R M I N A L  ║', delay: 1700 },
  { text: '  ║   Secure Document Intelligence       ║', delay: 1800 },
  { text: '  ╚══════════════════════════════════════╝', delay: 1900 },
  { text: '', delay: 2000 },
  { text: '> System ready. Launching desktop...', delay: 2200 },
]

interface BootSequenceProps {
  onComplete: () => void
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const skip = useCallback(() => {
    if (!done) {
      setDone(true)
      setTimeout(onComplete, 300)
    }
  }, [done, onComplete])

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    BOOT_LINES.forEach((line, i) => {
      const timer = setTimeout(() => {
        setVisibleLines(prev => [...prev, line.text])
      }, line.delay)
      timers.push(timer)
    })

    const finishTimer = setTimeout(() => {
      setDone(true)
      setTimeout(onComplete, 600)
    }, 2800)
    timers.push(finishTimer)

    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 z-[100] bg-void flex items-center justify-center cursor-pointer"
      onClick={skip}
    >
      <div className="w-full max-w-2xl px-8">
        <div className="space-y-1">
          {visibleLines.map((line, i) => (
            <div
              key={i}
              className="boot-text animate-boot-flicker"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {line}
              {i === visibleLines.length - 1 && !done && (
                <span className="boot-cursor" />
              )}
            </div>
          ))}
        </div>
        {!done && (
          <p className="text-text-dim text-xs mt-8 font-mono animate-pulse">
            click anywhere to skip
          </p>
        )}
      </div>

      {/* CRT scanline overlay */}
      <div className="crt-scanlines absolute inset-0 pointer-events-none" />
    </div>
  )
}
