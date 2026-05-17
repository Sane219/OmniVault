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
      {/* START Button — chunky retro */}
      <button
        className="flex items-center gap-2 px-3 py-1.5 mr-3 border border-[#00ff88]
                   bg-[#00ff88] text-black font-mono font-bold text-[11px] uppercase tracking-widest
                   hover:bg-[#00ff88]/80 hover:shadow-[0_0_12px_rgba(0,255,136,0.5)]
                   active:scale-95 transition-all duration-100 cursor-pointer"
        style={{ borderRadius: '2px' }}
      >
        <Shield className="w-4 h-4" />
        <span className="hidden sm:inline">Start</span>
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-[#335533] mr-3" />

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
      <div className="flex items-center gap-3 ml-4 pl-4 border-l border-[#335533]">
        {/* User */}
        <div className="flex items-center gap-2 text-[#4a5a4a]">
          <User className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono hidden sm:inline truncate max-w-[100px]">
            {userEmail || 'OPERATOR'}
          </span>
        </div>

        {/* Clock */}
        <SystemClock />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-1.5 text-[#4a5a4a] hover:text-[#ff3333] transition-colors cursor-pointer"
          title="Terminate Session"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
