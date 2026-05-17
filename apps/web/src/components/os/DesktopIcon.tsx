"use client"
import type { LucideIcon } from 'lucide-react'

interface DesktopIconProps {
  icon: LucideIcon
  label: string
  onClick: () => void
}

export function DesktopIcon({ icon: Icon, label, onClick }: DesktopIconProps) {
  return (
    <button
      className="flex flex-col items-center gap-2 cursor-pointer select-none group"
      onDoubleClick={onClick}
      title={`Double-click to open ${label}`}
    >
      {/* Icon container — w-16 h-16, bright neon glow */}
      <div
        className="w-16 h-16 rounded-lg flex items-center justify-center border border-[#00ff88]/30
                   bg-[#00ff88]/[0.06] transition-all duration-150
                   group-hover:border-[#00ff88]/70
                   group-hover:bg-[#00ff88]/[0.12]
                   group-hover:shadow-[0_0_20px_rgba(0,255,136,0.4),0_0_40px_rgba(0,255,136,0.15)]
                   group-active:scale-90"
      >
        <Icon className="w-8 h-8 text-[#00ff88] drop-shadow-[0_0_8px_rgba(0,255,136,0.6)]" />
      </div>

      {/* Label — monospace, bright green, glow on hover */}
      <span
        className="text-[11px] font-mono font-medium text-[#00ff88] text-center leading-tight max-w-[90px] truncate
                   drop-shadow-[0_0_4px_rgba(0,255,136,0.3)]
                   group-hover:drop-shadow-[0_0_8px_rgba(0,255,136,0.6)]
                   group-hover:text-white transition-all duration-150"
      >
        {label}
      </span>
    </button>
  )
}
