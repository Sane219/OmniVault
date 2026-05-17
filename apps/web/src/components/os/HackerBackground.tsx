"use client"

/**
 * Massive wireframe globe + radar sweep + concentric rings
 * Renders as a centered SVG at low opacity behind desktop icons.
 */
export function HackerBackground() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Wireframe Globe */}
      <svg
        viewBox="0 0 800 800"
        className="w-[min(90vw,800px)] h-[min(90vw,800px)] opacity-[0.12]"
        style={{ filter: 'drop-shadow(0 0 40px rgba(0,255,136,0.3))' }}
      >
        <defs>
          <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00ff88" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx="400" cy="400" r="380" fill="url(#globeGlow)" />

        {/* Concentric rings */}
        {[360, 300, 240, 180, 120, 60].map((r, i) => (
          <circle
            key={r}
            cx="400"
            cy="400"
            r={r}
            fill="none"
            stroke="#00ff88"
            strokeWidth={i === 0 ? 1.5 : 0.8}
            opacity={0.6 - i * 0.08}
          />
        ))}

        {/* Latitude lines (ellipses) */}
        {[-200, -120, 0, 120, 200].map((offset, i) => (
          <ellipse
            key={`lat-${i}`}
            cx="400"
            cy={400 + offset}
            rx={Math.sqrt(360 * 360 - offset * offset) || 0}
            ry={40}
            fill="none"
            stroke="#00ff88"
            strokeWidth="0.6"
            opacity="0.4"
          />
        ))}

        {/* Longitude lines (ellipses rotated) */}
        {[0, 30, 60, 90, 120, 150].map((angle, i) => (
          <ellipse
            key={`lon-${i}`}
            cx="400"
            cy="400"
            rx={360}
            ry={120}
            fill="none"
            stroke="#00ff88"
            strokeWidth="0.6"
            opacity="0.35"
            transform={`rotate(${angle} 400 400)`}
          />
        ))}

        {/* Cross-hairs */}
        <line x1="400" y1="20" x2="400" y2="780" stroke="#00ff88" strokeWidth="0.5" opacity="0.3" />
        <line x1="20" y1="400" x2="780" y2="400" stroke="#00ff88" strokeWidth="0.5" opacity="0.3" />

        {/* Diagonal cross */}
        <line x1="145" y1="145" x2="655" y2="655" stroke="#00ff88" strokeWidth="0.3" opacity="0.2" />
        <line x1="655" y1="145" x2="145" y2="655" stroke="#00ff88" strokeWidth="0.3" opacity="0.2" />

        {/* Radar sweep */}
        <defs>
          <linearGradient id="sweep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ff88" stopOpacity="0" />
            <stop offset="100%" stopColor="#00ff88" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <path
          d="M400,400 L400,40 A360,360 0 0,1 677,177 Z"
          fill="url(#sweep)"
          opacity="0.5"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 400 400"
            to="360 400 400"
            dur="8s"
            repeatCount="indefinite"
          />
        </path>

        {/* Tick marks around outer ring */}
        {Array.from({ length: 72 }).map((_, i) => {
          const angle = (i * 5 * Math.PI) / 180
          const inner = i % 3 === 0 ? 345 : 355
          const outer = 365
          return (
            <line
              key={`tick-${i}`}
              x1={400 + inner * Math.cos(angle)}
              y1={400 + inner * Math.sin(angle)}
              x2={400 + outer * Math.cos(angle)}
              y2={400 + outer * Math.sin(angle)}
              stroke="#00ff88"
              strokeWidth={i % 3 === 0 ? 1.2 : 0.5}
              opacity={i % 3 === 0 ? 0.6 : 0.3}
            />
          )
        })}

        {/* Cardinal labels */}
        {['N', 'E', 'S', 'W'].map((label, i) => {
          const positions = [
            { x: 400, y: 30 },
            { x: 770, y: 405 },
            { x: 400, y: 780 },
            { x: 30, y: 405 },
          ]
          return (
            <text
              key={label}
              x={positions[i].x}
              y={positions[i].y}
              fill="#00ff88"
              fontSize="14"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="middle"
              dominantBaseline="middle"
              opacity="0.5"
            >
              {label}
            </text>
          )
        })}

        {/* Center dot */}
        <circle cx="400" cy="400" r="4" fill="#00ff88" opacity="0.8">
          <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Scanning text */}
        <text x="400" y="760" fill="#00ff88" fontSize="10" fontFamily="JetBrains Mono, monospace"
          textAnchor="middle" opacity="0.4" letterSpacing="4">
          OMNIVAULT GLOBAL SURVEILLANCE NETWORK
        </text>
      </svg>

      {/* Grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
      />
    </div>
  )
}
