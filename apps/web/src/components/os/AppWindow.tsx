"use client"
import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useStore, type AppId } from '../../store/useStore'
import type { LucideIcon } from 'lucide-react'

interface AppWindowProps {
  id: AppId
  icon: LucideIcon
  children: ReactNode
}

export function AppWindow({ id, icon: Icon, children }: AppWindowProps) {
  const {
    windows, closeWindow, minimizeWindow, maximizeWindow,
    focusWindow, updateWindowPosition, updateWindowSize,
  } = useStore()

  const win = windows[id]
  const dragRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 })

  // ── Drag ────────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return
    focusWindow(id)
    setIsDragging(true)
    const rect = dragRef.current.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    e.preventDefault()
  }, [id, focusWindow])

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: MouseEvent) => {
      updateWindowPosition(
        id,
        Math.max(0, e.clientX - dragOffset.current.x),
        Math.max(0, e.clientY - dragOffset.current.y),
      )
    }
    const handleUp = () => setIsDragging(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, id, updateWindowPosition])

  // ── Resize ──────────────────────────────────────────────────────────────
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    focusWindow(id)
    setIsResizing(true)
    const currentWin = useStore.getState().windows[id]
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      w: currentWin.width,
      h: currentWin.height,
    }
    e.preventDefault()
  }, [id, focusWindow])

  useEffect(() => {
    if (!isResizing) return
    const start = resizeStart.current
    const handleMove = (e: MouseEvent) => {
      updateWindowSize(
        id,
        Math.max(300, start.w + (e.clientX - start.mouseX)),
        Math.max(200, start.h + (e.clientY - start.mouseY)),
      )
    }
    const handleUp = () => setIsResizing(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isResizing, id, updateWindowSize])

  if (!win.isOpen || win.isMinimized) return null

  const style: React.CSSProperties = win.isMaximized
    ? { position: 'absolute', inset: 0, zIndex: win.zIndex, borderRadius: 0 }
    : {
        position: 'absolute',
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }

  return (
    <div
      ref={dragRef}
      className="os-window flex flex-col"
      style={style}
      onMouseDown={() => focusWindow(id)}
    >
      {/* Title Bar */}
      <div className="os-window-titlebar" onMouseDown={handleDragStart}>
        <div className="flex gap-1.5">
          <button
            className="os-window-btn os-window-btn-close"
            onClick={(e) => { e.stopPropagation(); closeWindow(id) }}
            title="Close"
          />
          <button
            className="os-window-btn os-window-btn-minimize"
            onClick={(e) => { e.stopPropagation(); minimizeWindow(id) }}
            title="Minimize"
          />
          <button
            className="os-window-btn os-window-btn-maximize"
            onClick={(e) => { e.stopPropagation(); maximizeWindow(id) }}
            title="Maximize"
          />
        </div>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <Icon className="w-3.5 h-3.5 text-matrix-green-dim" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-text-dim select-none">
            {win.title}
          </span>
        </div>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {children}
      </div>

      {/* Resize Handle (bottom-right) */}
      {!win.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
          onMouseDown={handleResizeStart}
        >
          <svg className="w-4 h-4 text-matrix-green-dim opacity-50" viewBox="0 0 16 16">
            <path d="M14 16L16 14M14 12L12 14M14 8L8 14" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>
      )}
    </div>
  )
}
