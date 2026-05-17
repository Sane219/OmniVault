"use client"
import { create } from 'zustand'

// ── Existing types ───────────────────────────────────────────────────────────
export interface SelectedNode {
  id: string;
  label: string;
  type?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

// ── OS Window types ──────────────────────────────────────────────────────────
export type AppType = 'graph' | 'viewer' | 'chat' | 'files' | 'terminal'

export interface WindowState {
  id: string          // unique instance id, e.g. "graph-1", "files"
  appType: AppType
  title: string
  isOpen: boolean
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  x: number
  y: number
  width: number
  height: number
}

interface WindowConfig {
  appType: AppType
  title: string
  defaultX: number
  defaultY: number
  defaultWidth: number
  defaultHeight: number
}

export const WINDOW_CONFIGS: Record<AppType, WindowConfig> = {
  graph:    { appType: 'graph',    title: 'Intelligence Graph', defaultX: 80,  defaultY: 60,  defaultWidth: 700, defaultHeight: 500 },
  viewer:   { appType: 'viewer',   title: 'Document Viewer',    defaultX: 160, defaultY: 100, defaultWidth: 650, defaultHeight: 550 },
  chat:     { appType: 'chat',     title: 'Terminal Chat',      defaultX: 240, defaultY: 140, defaultWidth: 500, defaultHeight: 450 },
  files:    { appType: 'files',    title: 'File Manager',       defaultX: 320, defaultY: 180, defaultWidth: 550, defaultHeight: 400 },
  terminal: { appType: 'terminal', title: 'Terminal',           defaultX: 200, defaultY: 120, defaultWidth: 600, defaultHeight: 400 },
}

// ── Document management types ────────────────────────────────────────────────
export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed' | 'error'

export interface DocumentRecord {
  id: string
  title: string
  status: string
  error_message?: string
  created_at?: string
}

// ── Store ────────────────────────────────────────────────────────────────────
interface StoreState {
  // Auth
  accessToken: string | null;
  userEmail: string | null;
  setAccessToken: (token: string | null) => void;
  setUserEmail: (email: string | null) => void;

  // Document
  activeDocument: string | null;
  selectedNode: SelectedNode | null;
  chatMessages: ChatMessage[];
  setActiveDocument: (doc: string | null) => void;
  setSelectedNode: (node: SelectedNode | null) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  clearChatMessages: () => void;

  // Document management
  processingStatus: ProcessingStatus;
  statusMessage: string;
  errorMessage: string;
  graphData: any;
  documentUrl: string | null;
  history: DocumentRecord[];
  historyLoading: boolean;
  setProcessingStatus: (s: ProcessingStatus) => void;
  setStatusMessage: (m: string) => void;
  setErrorMessage: (m: string) => void;
  setGraphData: (d: any) => void;
  setDocumentUrl: (u: string | null) => void;
  setHistory: (h: DocumentRecord[]) => void;
  setHistoryLoading: (l: boolean) => void;

  // OS
  booted: boolean;
  setBootComplete: () => void;

  // Windows (multi-instance)
  windows: Record<string, WindowState>
  topZ: number
  openWindow: (appType: AppType) => void      // opens new instance
  focusOrCreateWindow: (appType: AppType) => void  // focus existing or create new
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  maximizeWindow: (id: string) => void
  restoreWindow: (id: string) => void
  focusWindow: (id: string) => void
  updateWindowPosition: (id: string, x: number, y: number) => void
  updateWindowSize: (id: string, width: number, height: number) => void
  snapWindow: (id: string, snap: 'left' | 'right' | 'maximize') => void

  // Start menu
  startMenuOpen: boolean
  toggleStartMenu: () => void
  closeStartMenu: () => void
}

let instanceCounters: Record<string, number> = {}

function createWindowInstance(appType: AppType): WindowState {
  const cfg = WINDOW_CONFIGS[appType]
  if (!instanceCounters[appType]) instanceCounters[appType] = 0
  instanceCounters[appType]++
  const id = `${appType}-${instanceCounters[appType]}`
  // Stagger position for multiple instances
  const offset = (instanceCounters[appType] - 1) * 30
  return {
    id,
    appType,
    title: cfg.title,
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: 100,
    x: cfg.defaultX + offset,
    y: cfg.defaultY + offset,
    width: cfg.defaultWidth,
    height: cfg.defaultHeight,
  }
}

export const useStore = create<StoreState>((set, get) => ({
  // Auth
  accessToken: null,
  userEmail: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUserEmail: (email) => set({ userEmail: email }),

  // Document
  activeDocument: null,
  selectedNode: null,
  chatMessages: [],
  setActiveDocument: (doc) => set({ activeDocument: doc, selectedNode: null, chatMessages: [] }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  clearChatMessages: () => set({ chatMessages: [] }),

  // Document management
  processingStatus: 'idle',
  statusMessage: 'Awaiting document upload...',
  errorMessage: '',
  graphData: null,
  documentUrl: null,
  history: [],
  historyLoading: false,
  setProcessingStatus: (s) => set({ processingStatus: s }),
  setStatusMessage: (m) => set({ statusMessage: m }),
  setErrorMessage: (m) => set({ errorMessage: m }),
  setGraphData: (d) => set({ graphData: d }),
  setDocumentUrl: (u) => set({ documentUrl: u }),
  setHistory: (h) => set({ history: h }),
  setHistoryLoading: (l) => set({ historyLoading: l }),

  // OS
  booted: false,
  setBootComplete: () => set({ booted: true }),

  // Windows
  windows: {},
  topZ: 100,

  openWindow: (appType) => {
    const { windows, topZ } = get()
    const win = createWindowInstance(appType)
    win.zIndex = topZ + 1
    set({
      windows: { ...windows, [win.id]: win },
      topZ: topZ + 1,
      startMenuOpen: false,
    })
  },

  focusOrCreateWindow: (appType) => {
    const { windows, topZ } = get()
    // Find first existing open instance of this app type
    const existing = Object.values(windows).find(w => w.appType === appType && w.isOpen)
    if (existing) {
      set({
        windows: {
          ...windows,
          [existing.id]: { ...existing, isMinimized: false, zIndex: topZ + 1 },
        },
        topZ: topZ + 1,
        startMenuOpen: false,
      })
    } else {
      get().openWindow(appType)
    }
  },

  closeWindow: (id) => {
    const { windows } = get()
    const next = { ...windows }
    delete next[id]
    set({ windows: next })
  },

  minimizeWindow: (id) => {
    const { windows } = get()
    if (!windows[id]) return
    set({ windows: { ...windows, [id]: { ...windows[id], isMinimized: true } } })
  },

  maximizeWindow: (id) => {
    const { windows } = get()
    if (!windows[id]) return
    set({ windows: { ...windows, [id]: { ...windows[id], isMaximized: !windows[id].isMaximized } } })
  },

  restoreWindow: (id) => {
    const { windows, topZ } = get()
    if (!windows[id]) return
    set({
      windows: { ...windows, [id]: { ...windows[id], isMinimized: false, zIndex: topZ + 1 } },
      topZ: topZ + 1,
    })
  },

  focusWindow: (id) => {
    const { windows, topZ } = get()
    if (!windows[id]) return
    set({
      windows: { ...windows, [id]: { ...windows[id], zIndex: topZ + 1 } },
      topZ: topZ + 1,
    })
  },

  updateWindowPosition: (id, x, y) => {
    const { windows } = get()
    if (!windows[id]) return
    set({ windows: { ...windows, [id]: { ...windows[id], x, y } } })
  },

  updateWindowSize: (id, width, height) => {
    const { windows } = get()
    if (!windows[id]) return
    set({ windows: { ...windows, [id]: { ...windows[id], width, height } } })
  },

  snapWindow: (id, snap) => {
    const { windows } = get()
    const win = windows[id]
    if (!win) return
    if (snap === 'maximize') {
      set({ windows: { ...windows, [id]: { ...win, isMaximized: true } } })
      return
    }
    const sw = window.innerWidth
    const sh = window.innerHeight - 48 // taskbar height
    const halfW = Math.floor(sw / 2)
    set({
      windows: {
        ...windows,
        [id]: {
          ...win,
          isMaximized: false,
          x: snap === 'left' ? 0 : halfW,
          y: 0,
          width: halfW,
          height: sh,
        },
      },
    })
  },

  // Start menu
  startMenuOpen: false,
  toggleStartMenu: () => set(s => ({ startMenuOpen: !s.startMenuOpen })),
  closeStartMenu: () => set({ startMenuOpen: false }),
}))
