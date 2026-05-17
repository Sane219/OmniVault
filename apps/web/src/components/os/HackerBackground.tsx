"use client"
import { useRef, useEffect } from 'react'

/**
 * Live matrix rain + wireframe globe + radar sweep.
 * Canvas-based for smooth 60fps animation.
 */
export function HackerBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const globeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Matrix rain columns
    const fontSize = 14
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()アイウエオカキクケコサシスセソタチツテトナニヌネノ'
    let columns = Math.floor(canvas.width / fontSize)
    let drops: number[] = Array(columns).fill(1).map(() => Math.random() * -100)

    const draw = () => {
      // Fade trail
      ctx.fillStyle = 'rgba(10, 10, 10, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${fontSize}px JetBrains Mono, monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        const x = i * fontSize
        const y = drops[i] * fontSize

        // Leading bright character
        ctx.fillStyle = 'rgba(0, 255, 136, 0.9)'
        ctx.fillText(char, x, y)

        // Trail characters (dimmer)
        if (drops[i] > 1) {
          ctx.fillStyle = 'rgba(0, 255, 136, 0.15)'
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize)
        }

        drops[i]++
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
      }

      animFrameId = requestAnimationFrame(draw)
    }

    let animFrameId = requestAnimationFrame(draw)

    // Handle resize for columns
    const onResize = () => {
      resize()
      columns = Math.floor(canvas.width / fontSize)
      drops = Array(columns).fill(1).map(() => Math.random() * -100)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animFrameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Matrix rain canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: 0.15 }}
      />

      {/* Wireframe globe SVG overlay */}
      <div ref={globeRef} className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 800 800"
          className="w-[min(85vw,700px)] h-[min(85vw,700px)] opacity-[0.08]"
          style={{ filter: 'drop-shadow(0 0 40px rgba(0,255,136,0.3))' }}
        >
          <defs>
            <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="sweep" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          <circle cx="400" cy="400" r="380" fill="url(#globeGlow)" />

          {[360, 300, 240, 180, 120, 60].map((r, i) => (
            <circle key={r} cx="400" cy="400" r={r} fill="none" stroke="#00ff88"
              strokeWidth={i === 0 ? 1.5 : 0.8} opacity={0.6 - i * 0.08} />
          ))}

          {[-200, -120, 0, 120, 200].map((offset, i) => (
            <ellipse key={`lat-${i}`} cx="400" cy={400 + offset}
              rx={Math.sqrt(360 * 360 - offset * offset) || 0} ry={40}
              fill="none" stroke="#00ff88" strokeWidth="0.6" opacity="0.4" />
          ))}

          {[0, 30, 60, 90, 120, 150].map((angle, i) => (
            <ellipse key={`lon-${i}`} cx="400" cy="400" rx={360} ry={120}
              fill="none" stroke="#00ff88" strokeWidth="0.6" opacity="0.35"
              transform={`rotate(${angle} 400 400)`} />
          ))}

          <line x1="400" y1="20" x2="400" y2="780" stroke="#00ff88" strokeWidth="0.5" opacity="0.3" />
          <line x1="20" y1="400" x2="780" y2="400" stroke="#00ff88" strokeWidth="0.5" opacity="0.3" />
          <line x1="145" y1="145" x2="655" y2="655" stroke="#00ff88" strokeWidth="0.3" opacity="0.2" />
          <line x1="655" y1="145" x2="145" y2="655" stroke="#00ff88" strokeWidth="0.3" opacity="0.2" />

          <path d="M400,400 L400,40 A360,360 0 0,1 677,177 Z" fill="url(#sweep)" opacity="0.5">
            <animateTransform attributeName="transform" type="rotate"
              from="0 400 400" to="360 400 400" dur="8s" repeatCount="indefinite" />
          </path>

          {Array.from({ length: 72 }).map((_, i) => {
            const angle = (i * 5 * Math.PI) / 180
            const inner = i % 3 === 0 ? 345 : 355
            return (
              <line key={`tick-${i}`}
                x1={400 + inner * Math.cos(angle)} y1={400 + inner * Math.sin(angle)}
                x2={400 + 365 * Math.cos(angle)} y2={400 + 365 * Math.sin(angle)}
                stroke="#00ff88" strokeWidth={i % 3 === 0 ? 1.2 : 0.5}
                opacity={i % 3 === 0 ? 0.6 : 0.3} />
            )
          })}

          {['N', 'E', 'S', 'W'].map((label, i) => {
            const pos = [{ x: 400, y: 30 }, { x: 770, y: 405 }, { x: 400, y: 780 }, { x: 30, y: 405 }][i]
            return (
              <text key={label} x={pos.x} y={pos.y} fill="#00ff88" fontSize="14"
                fontFamily="JetBrains Mono, monospace" textAnchor="middle" dominantBaseline="middle" opacity="0.5">
                {label}
              </text>
            )
          })}

          <circle cx="400" cy="400" r="4" fill="#00ff88" opacity="0.8">
            <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
          </circle>

          <text x="400" y="760" fill="#00ff88" fontSize="10" fontFamily="JetBrains Mono, monospace"
            textAnchor="middle" opacity="0.4" letterSpacing="4">
            OMNIVAULT GLOBAL SURVEILLANCE NETWORK
          </text>
        </svg>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.8) 100%)' }} />
    </div>
  )
}
