"use client"
import { useStore, type AppId } from '../../store/useStore'
import { SystemClock } from './SystemClock'
import { Shield, Network, FileText, MessageSquare, FolderOpen, LogOut, User } from 'lucide-react'

const APP_ICONS: Record<AppId, typeof Network> = {
  graph: Network,
  viewer: FileText,
  chat: MessageSquare,
  files: FolderOpen,
}

export function Taskbar() {
  const { windows, openWindow, restoreWindow, minimizeWindow, focusWindow, userEmail, setAccessToken } = useStore()

  const handleAppClick = (id: AppId) => {
    const win = windows[id]
    if (!win.isOpen) {
      openWindow(id)
    } else if (win.isMinimized) {
      restoreWindow(id)
    } else {
      minimizeWindow(id)
    }
  }

  const handleLogout = () => {
    document.cookie = 'omnivault_token=; path=/; max-age=0'
    setAccessToken(null)
  }

  const openWindows = Object.values(windows).filter(w => w.isOpen)

  return (
    <div className="taskbar">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-4 pr-4 border-r border-panel-border">
        <div className="w-7 h-7 rounded-terminal bg-matrix-green-faint border border-panel-border flex items-center justify-center shadow-neon">
          <Shield className="w-4 h-4 text-matrix-green" />
        </div>
        <span className="text-xs font-mono font-bold text-matrix-green uppercase tracking-widest hidden sm:inline">
          OmniVault
        </span>
      </div>

      {/* Running Apps */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {openWindows.map(win => {
          const Icon = APP_ICONS[win.id]
          return (
            <button
              key={win.id}
              onClick={() => handleAppClick(win.id)}
              className={`taskbar-item ${!win.isMinimized ? 'taskbar-item-active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{win.title}</span>
            </button>
          )
        })}
      </div>

      {/* System Tray */}
      <div className="flex items-center gap-3 ml-4 pl-4 border-l border-panel-border">
        {/* User */}
        <div className="flex items-center gap-2 text-text-dim">
          <User className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono hidden sm:inline truncate max-w-[120px]">
            {userEmail || 'operator'}
          </span>
        </div>

        {/* Clock */}
        <SystemClock />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-1.5 text-text-dim hover:text-red-alert transition-colors cursor-pointer"
          title="Terminate Session"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
