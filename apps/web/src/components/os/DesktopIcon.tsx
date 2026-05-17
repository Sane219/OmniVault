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
      className="flex flex-col items-center gap-1.5 p-3 rounded-panel cursor-pointer
                 transition-all duration-150 select-none border border-transparent
                 hover:bg-[rgba(0,255,136,0.08)] hover:border-[rgba(0,255,136,0.3)]
                 active:scale-95 group"
      onDoubleClick={onClick}
      title={`Double-click to open ${label}`}
    >
      <div className="w-14 h-14 rounded-panel flex items-center justify-center
                      bg-[rgba(0,255,136,0.06)] border border-[rgba(0,255,136,0.2)]
                      transition-all duration-150
                      group-hover:border-[rgba(0,255,136,0.5)]
                      group-hover:shadow-[0_0_12px_rgba(0,255,136,0.3)]">
        <Icon className="w-7 h-7 text-[#00ff88]" />
      </div>
      <span className="text-[11px] font-mono text-[#00ff88] text-center leading-tight max-w-[80px] truncate
                       drop-shadow-[0_0_4px_rgba(0,255,136,0.4)]">
        {label}
      </span>
    </button>
  )
}
