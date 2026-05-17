"use client"
import { type LucideIcon } from 'lucide-react'

interface DesktopIconProps {
  icon: LucideIcon
  label: string
  onClick: () => void
}

export function DesktopIcon({ icon: Icon, label, onClick }: DesktopIconProps) {
  return (
    <button
      className="desktop-icon group"
      onDoubleClick={onClick}
      title={`Double-click to open ${label}`}
    >
      <div className="desktop-icon-glow w-12 h-12 rounded-panel bg-matrix-green-faint border border-panel-border flex items-center justify-center transition-all duration-150">
        <Icon className="w-6 h-6 text-matrix-green-dim group-hover:text-matrix-green transition-colors" />
      </div>
      <span className="text-[11px] font-mono text-text-dim group-hover:text-matrix-green text-center leading-tight max-w-[80px] truncate transition-colors">
        {label}
      </span>
    </button>
  )
}
