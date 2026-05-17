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
export type AppId = 'graph' | 'viewer' | 'chat' | 'files'

export interface WindowState {
  id: AppId
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
  id: AppId
  title: string
  defaultX: number
  defaultY: number
  defaultWidth: number
  defaultHeight: number
}

export const WINDOW_CONFIGS: WindowConfig[] = [
  { id: 'graph', title: 'Intelligence Graph', defaultX: 80, defaultY: 60, defaultWidth: 700, defaultHeight: 500 },
  { id: 'viewer', title: 'Document Viewer', defaultX: 160, defaultY: 100, defaultWidth: 650, defaultHeight: 550 },
  { id: 'chat', title: 'Terminal Chat', defaultX: 240, defaultY: 140, defaultWidth: 500, defaultHeight: 450 },
  { id: 'files', title: 'File Manager', defaultX: 320, defaultY: 180, defaultWidth: 550, defaultHeight: 400 },
]

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

  // Document management (shared across all app windows)
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
  windows: Record<AppId, WindowState>;
  openWindow: (id: AppId) => void;
  closeWindow: (id: AppId) => void;
  minimizeWindow: (id: AppId) => void;
  maximizeWindow: (id: AppId) => void;
  restoreWindow: (id: AppId) => void;
  focusWindow: (id: AppId) => void;
  updateWindowPosition: (id: AppId, x: number, y: number) => void;
  updateWindowSize: (id: AppId, width: number, height: number) => void;
  topZ: number;
}

const defaultWindows: Record<AppId, WindowState> = {} as Record<AppId, WindowState>
for (const cfg of WINDOW_CONFIGS) {
  defaultWindows[cfg.id] = {
    id: cfg.id,
    title: cfg.title,
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 100,
    x: cfg.defaultX,
    y: cfg.defaultY,
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

  windows: { ...defaultWindows },
  topZ: 100,

  openWindow: (id) => {
    const { windows, topZ } = get()
    const newZ = topZ + 1
    set({
      windows: {
        ...windows,
        [id]: { ...windows[id], isOpen: true, isMinimized: false, zIndex: newZ },
      },
      topZ: newZ,
    })
  },

  closeWindow: (id) => {
    const { windows } = get()
    set({
      windows: {
        ...windows,
        [id]: { ...windows[id], isOpen: false, isMinimized: false },
      },
    })
  },

  minimizeWindow: (id) => {
    const { windows } = get()
    set({
      windows: {
        ...windows,
        [id]: { ...windows[id], isMinimized: true },
      },
    })
  },

  maximizeWindow: (id) => {
    const { windows } = get()
    set({
      windows: {
        ...windows,
        [id]: { ...windows[id], isMaximized: !windows[id].isMaximized },
      },
    })
  },

  restoreWindow: (id) => {
    const { windows, topZ } = get()
    const newZ = topZ + 1
    set({
      windows: {
        ...windows,
        [id]: { ...windows[id], isMinimized: false, zIndex: newZ },
      },
      topZ: newZ,
    })
  },

  focusWindow: (id) => {
    const { windows, topZ } = get()
    const newZ = topZ + 1
    set({
      windows: {
        ...windows,
        [id]: { ...windows[id], zIndex: newZ },
      },
      topZ: newZ,
    })
  },

  updateWindowPosition: (id, x, y) => {
    const { windows } = get()
    set({
      windows: {
        ...windows,
        [id]: { ...windows[id], x, y },
      },
    })
  },

  updateWindowSize: (id, width, height) => {
    const { windows } = get()
    set({
      windows: {
        ...windows,
        [id]: { ...windows[id], width, height },
      },
    })
  },
}))
