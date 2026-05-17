"use client"
import { useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { AppWindow } from './AppWindow'
import { DesktopIcon } from './DesktopIcon'
import { Taskbar } from './Taskbar'
import { HackerBackground } from './HackerBackground'
import { Network, FileText, MessageSquare, FolderOpen } from 'lucide-react'
import { GraphApp } from '../apps/GraphApp'
import { ViewerApp } from '../apps/ViewerApp'
import { ChatApp } from '../apps/ChatApp'
import { FileManagerApp } from '../apps/FileManagerApp'

const DESKTOP_ICONS = [
  { id: 'graph' as const, icon: Network, label: 'Intelligence Graph' },
  { id: 'viewer' as const, icon: FileText, label: 'Document Viewer' },
  { id: 'chat' as const, icon: MessageSquare, label: 'Terminal Chat' },
  { id: 'files' as const, icon: FolderOpen, label: 'File Manager' },
]

export function Desktop() {
  const openWindow = useStore(s => s.openWindow)

  // Auto-open File Manager on first load
  useEffect(() => {
    const timer = setTimeout(() => openWindow('files'), 300)
    return () => clearTimeout(timer)
  }, [openWindow])

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] relative overflow-hidden">
      {/* Wireframe Globe + Grid Background */}
      <HackerBackground />

      {/* Desktop Area */}
      <div className="flex-1 relative min-h-0">
        {/* Desktop Icons — RIGHT side column (GeekPrank style) */}
        <div
          className="absolute top-8 right-6 flex flex-col gap-5"
          style={{ zIndex: 60 }}
        >
          {DESKTOP_ICONS.map(item => (
            <DesktopIcon
              key={item.id}
              icon={item.icon}
              label={item.label}
              onClick={() => openWindow(item.id)}
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

        {/* App Windows */}
        <AppWindow id="graph" icon={Network}>
          <GraphApp />
        </AppWindow>
        <AppWindow id="viewer" icon={FileText}>
          <ViewerApp />
        </AppWindow>
        <AppWindow id="chat" icon={MessageSquare}>
          <ChatApp />
        </AppWindow>
        <AppWindow id="files" icon={FolderOpen}>
          <FileManagerApp />
        </AppWindow>
      </div>

      {/* CRT Scanlines — above desktop content, below windows */}
      <div className="crt-scanlines absolute inset-0 pointer-events-none" style={{ zIndex: 55 }} />

      {/* Taskbar — always on top */}
      <div style={{ position: 'relative', zIndex: 70 }}>
        <Taskbar />
      </div>
    </div>
  )
}
