"use client"
import { useStore } from '../../store/useStore'
import { AppWindow } from './AppWindow'
import { DesktopIcon } from './DesktopIcon'
import { Taskbar } from './Taskbar'
import { HackerBackground } from './HackerBackground'
import { Network, FileText, MessageSquare, FolderOpen, Terminal } from 'lucide-react'
import { GraphApp } from '../apps/GraphApp'
import { ViewerApp } from '../apps/ViewerApp'
import { ChatApp } from '../apps/ChatApp'
import { FileManagerApp } from '../apps/FileManagerApp'
import { TerminalApp } from '../apps/TerminalApp'

const DESKTOP_ICONS = [
  { type: 'graph' as const, icon: Network, label: 'Intelligence Graph' },
  { type: 'viewer' as const, icon: FileText, label: 'Document Viewer' },
  { type: 'chat' as const, icon: MessageSquare, label: 'Terminal Chat' },
  { type: 'files' as const, icon: FolderOpen, label: 'File Manager' },
  { type: 'terminal' as const, icon: Terminal, label: 'Terminal' },
]

const APP_COMPONENTS: Record<string, React.ComponentType> = {
  graph: GraphApp,
  viewer: ViewerApp,
  chat: ChatApp,
  files: FileManagerApp,
  terminal: TerminalApp,
}

const APP_ICONS: Record<string, typeof Network> = {
  graph: Network,
  viewer: FileText,
  chat: MessageSquare,
  files: FolderOpen,
  terminal: Terminal,
}

export function Desktop() {
  const openWindow = useStore(s => s.openWindow)
  const windows = useStore(s => s.windows)
  const closeStartMenu = useStore(s => s.closeStartMenu)

  return (
    <div
      className="h-screen w-screen flex flex-col bg-[#0a0a0a] relative overflow-hidden"
      onClick={closeStartMenu}
    >
      {/* Live Matrix Rain + Globe Background */}
      <HackerBackground />

      {/* Desktop Area */}
      <div className="flex-1 relative min-h-0">
        {/* Desktop Icons — RIGHT side column */}
        <div className="absolute top-8 right-6 flex flex-col gap-5" style={{ zIndex: 60 }}>
          {DESKTOP_ICONS.map(item => (
            <DesktopIcon
              key={item.type}
              icon={item.icon}
              label={item.label}
              onClick={() => openWindow(item.type)}
            />
          ))}
        </div>

        {/* Status HUD — top-left */}
        <div className="absolute top-6 left-6 font-mono text-[10px] text-[#00ff88]/40 uppercase tracking-[0.3em] leading-relaxed" style={{ zIndex: 60 }}>
          <p>&gt; system online</p>
          <p>&gt; surveillance active</p>
          <p>&gt; awaiting operator input</p>
          <p className="mt-2 text-[#00ff88]/25">double-click folder to deploy</p>
        </div>

        {/* App Windows — render ALL open instances */}
        {Object.values(windows).map(win => {
          const AppComponent = APP_COMPONENTS[win.appType]
          const Icon = APP_ICONS[win.appType]
          if (!AppComponent || !Icon) return null
          return (
            <AppWindow key={win.id} id={win.id} appType={win.appType} icon={Icon}>
              <AppComponent />
            </AppWindow>
          )
        })}
      </div>

      {/* CRT Scanlines */}
      <div className="crt-scanlines absolute inset-0 pointer-events-none" style={{ zIndex: 55 }} />

      {/* Taskbar */}
      <div style={{ position: 'relative', zIndex: 70 }}>
        <Taskbar />
      </div>
    </div>
  )
}
