"use client"
import { useStore, type AppType } from '../../store/useStore'
import { SystemClock } from './SystemClock'
import {
  Shield, Network, FileText, MessageSquare, FolderOpen, Terminal,
  LogOut, User, ChevronRight,
} from 'lucide-react'

const APP_ICONS: Record<AppType, typeof Network> = {
  graph: Network,
  viewer: FileText,
  chat: MessageSquare,
  files: FolderOpen,
  terminal: Terminal,
}

const START_MENU_ITEMS = [
  { type: 'graph' as const, label: 'Intelligence Graph', icon: Network },
  { type: 'viewer' as const, label: 'Document Viewer', icon: FileText },
  { type: 'chat' as const, label: 'Terminal Chat', icon: MessageSquare },
  { type: 'files' as const, label: 'File Manager', icon: FolderOpen },
  { type: 'terminal' as const, label: 'Terminal', icon: Terminal },
]

export function Taskbar() {
  const {
    windows, openWindow, restoreWindow, minimizeWindow,
    userEmail, setAccessToken,
    startMenuOpen, toggleStartMenu, closeStartMenu,
  } = useStore()

  const handleAppClick = (id: string) => {
    const win = windows[id]
    if (!win) return
    if (win.isMinimized) {
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
      {/* START Button + Menu */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); toggleStartMenu() }}
          className="flex items-center gap-2 px-3 py-1.5 mr-3 border border-[#00ff88]
                     bg-[#00ff88] text-black font-mono font-bold text-[11px] uppercase tracking-widest
                     hover:bg-[#00ff88]/80 hover:shadow-[0_0_12px_rgba(0,255,136,0.5)]
                     active:scale-95 transition-all duration-100 cursor-pointer"
          style={{ borderRadius: '2px' }}
        >
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Start</span>
        </button>

        {/* Start Menu Dropdown */}
        {startMenuOpen && (
          <div
            className="absolute bottom-full left-0 mb-2 w-64 bg-[#0a0a0a] border border-[#00ff88]/30
                       shadow-[0_0_20px_rgba(0,255,136,0.15)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 9999 }}
          >
            {/* Profile Header */}
            <div className="px-4 py-3 border-b border-[#00ff88]/20 bg-[#00ff88]/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#00ff88]/40 bg-[#00ff88]/[0.08]
                              flex items-center justify-center">
                  <User className="w-5 h-5 text-[#00ff88]" />
                </div>
                <div>
                  <p className="text-xs font-mono text-[#00ff88] font-medium">
                    {userEmail || 'OPERATOR'}
                  </p>
                  <p className="text-[10px] font-mono text-[#4a5a4a] uppercase tracking-wider">
                    System Administrator
                  </p>
                </div>
              </div>
            </div>

            {/* App Shortcuts */}
            <div className="py-1">
              {START_MENU_ITEMS.map(item => (
                <button
                  key={item.type}
                  onClick={() => { openWindow(item.type); closeStartMenu() }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left
                           hover:bg-[#00ff88]/[0.08] transition-colors cursor-pointer group"
                >
                  <item.icon className="w-4 h-4 text-[#00ff88]/60 group-hover:text-[#00ff88]" />
                  <span className="text-[11px] font-mono text-[#4a5a4a] group-hover:text-[#00ff88]">
                    {item.label}
                  </span>
                  <ChevronRight className="w-3 h-3 text-[#335533] ml-auto group-hover:text-[#00ff88]/40" />
                </button>
              ))}
            </div>

            {/* Logout */}
            <div className="border-t border-[#00ff88]/20 py-1">
              <button
                onClick={() => { handleLogout(); closeStartMenu() }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left
                         hover:bg-[#ff3333]/[0.08] transition-colors cursor-pointer group"
              >
                <LogOut className="w-4 h-4 text-[#ff3333]/60 group-hover:text-[#ff3333]" />
                <span className="text-[11px] font-mono text-[#4a5a4a] group-hover:text-[#ff3333]">
                  Terminate Session
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-[#335533] mr-3" />

      {/* Running Apps */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {openWindows.map(win => {
          const Icon = APP_ICONS[win.appType]
          if (!Icon) return null
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
        <div className="flex items-center gap-2 text-[#4a5a4a]">
          <User className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono hidden sm:inline truncate max-w-[100px]">
            {userEmail || 'OPERATOR'}
          </span>
        </div>
        <SystemClock />
        <button onClick={handleLogout}
          className="p-1.5 text-[#4a5a4a] hover:text-[#ff3333] transition-colors cursor-pointer"
          title="Terminate Session">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
