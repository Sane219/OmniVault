"use client"
import { useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { AppWindow } from './AppWindow'
import { DesktopIcon } from './DesktopIcon'
import { Taskbar } from './Taskbar'
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
    <div
      className="h-screen w-screen flex flex-col bg-void relative overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      {/* Ambient orbs */}
      <div className="orb w-[600px] h-[600px] bg-matrix-green/[0.04] top-[-200px] right-[-100px]" />
      <div className="orb w-[400px] h-[400px] bg-matrix-green/[0.02] bottom-[200px] left-[-100px]" />

      {/* Desktop Area */}
      <div className="flex-1 relative min-h-0">
        {/* Desktop Icons — top-left grid */}
        <div className="absolute top-6 left-6 grid grid-cols-1 gap-2" style={{ zIndex: 60 }}>
          {DESKTOP_ICONS.map(item => (
            <DesktopIcon
              key={item.id}
              icon={item.icon}
              label={item.label}
              onClick={() => openWindow(item.id)}
            />
          ))}
        </div>

        {/* Welcome text */}
        <div className="absolute top-6 left-32" style={{ zIndex: 60 }}>
          <p className="text-[#4a5a4a] font-mono text-[11px] uppercase tracking-widest">
            double-click an icon to launch
          </p>
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
