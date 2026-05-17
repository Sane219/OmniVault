# OmniVault — Hacker OS Architecture

## Vision

OmniVault becomes a **Simulated Hacker OS** — a full-screen desktop environment that feels like booting into an elite underground UNIX terminal. No SaaS dashboard. No navigation bars. The user boots into a dark void, sees a terminal-style boot sequence, then lands on a desktop with draggable application windows, a taskbar, and desktop icons.

---

## Design System (from ui-ux-pro-max)

| Token | Value | Role |
|-------|-------|------|
| `void` | `#000000` | Desktop background, deep void |
| `terminal` | `#0a0f0a` | Window backgrounds, taskbar |
| `panel` | `rgba(0,15,0,0.85)` | Panel fills inside windows |
| `matrix-green` | `#00ff88` | Primary accent — borders, text, glow, CTA |
| `matrix-green-dim` | `#335533` | Muted borders, disabled states |
| `matrix-green-glow` | `rgba(0,255,136,0.25)` | Box-shadow glow |
| `text-bright` | `#00ff88` | Headings, active labels |
| `text-normal` | `#a0b0a0` | Body text |
| `text-dim` | `#4a5a4a` | Placeholders, disabled |

**Typography**: JetBrains Mono (headings, UI labels, terminal) + IBM Plex Sans (body text in documents). Strict `font-mono` for all OS chrome.

**Textures**: CRT scanline overlay (global), terminal grid background (40px), neon glow box-shadows on all interactive surfaces.

**Motion**: Glitch-jitter on hover (80-150ms), glow-pulse on active states (2s), matrix-fall shimmer for loading. All reactive, never constant. Respect `prefers-reduced-motion`.

---

## OS Architecture

### Layer 1: Boot Sequence

A full-screen terminal boot animation that plays once on first load (cached via `sessionStorage`).

**Implementation**:
- Typewriter effect component cycling through fake kernel messages
- Lines like `[OK] OmniVault Kernel 6.1.0-matrix`, `[OK] Mounting /dev/knowledge`, `[OK] Starting AI subsystem...`
- Matrix green text on void black, monospace font
- Skip on click or after ~4 seconds
- Transitions to desktop with a fade-to-black then reveal

**21st.dev component**: Use "Terminal" or "Code Block" typewriter component for the boot text animation.

### Layer 2: Desktop

The desktop is the root container — full viewport, void black background with terminal grid texture.

**Layout (CSS Grid)**:
```
┌──────────────────────────────────────────────┐
│                                              │
│           Desktop (grid-bg, crt-scanlines)   │
│                                              │
│    [Icon] [Icon] [Icon] [Icon]               │
│    Graph  PDF    Chat   Docs                 │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│ Taskbar                                      │
└──────────────────────────────────────────────┘
```

- **Desktop area**: `flex-1` with `relative` positioning for absolute-placed draggable windows
- **Desktop icons**: Grid of icon+label pairs in top-left quadrant, click to launch app
- **Z-index management**: Desktop=0, Icons=10, Windows=20+, Taskbar=50, Boot=100

### Layer 3: Taskbar

A fixed bottom bar — the OS command center.

**Structure**:
```
[OV Logo] [Running Apps...] ──────────── [Clock] [User] [Power]
```

- **Left**: OmniVault brand logo (shield icon, neon glow)
- **Center**: Active app indicators (click to focus/minimize windows)
- **Right**: System clock (live, monospace), user email, logout button (terminate session)

**21st.dev component**: Use "Dock" or "Navbar" — retro OS menu bar with icon indicators.

### Layer 4: Draggable App Windows

Each app (Graph, PDF Viewer, Chat, Document Manager) lives inside a draggable, resizable window.

**Window chrome** (from 21st.dev Floating Panel / Draggable Card):
```
┌── [●] [●] [●] ── WINDOW TITLE ─────────┐
│                                          │
│          App Content                     │
│                                          │
└──────────────────────────────────────────┘
```

- **Title bar**: Three buttons (close=red, minimize=amber, maximize=green), window title in mono uppercase
- **Border**: `1px solid rgba(0,255,136,0.3)` with `box-shadow: neon-glow`
- **Background**: `bg-terminal` with `backdrop-filter: blur(4px)`
- **Drag**: Via header bar (Framer Motion `drag` or native pointer events)
- **Resize**: Corner handles
- **Minimize**: Shrinks to taskbar indicator
- **Close**: Removes from desktop, returns to icon state

**21st.dev components**:
- `Floating Panel` from @ark-ui/react — has drag, resize, minimize, maximize, close built in
- `Draggable Card` — Framer Motion drag with spring physics

### Layer 5: App Windows

| App | Desktop Icon | Window Content |
|-----|-------------|----------------|
| **Intelligence Graph** | Network icon | KnowledgeGraph component (D3/force graph) |
| **Document Viewer** | FileText icon | PdfViewer component |
| **Terminal Chat** | Terminal icon | ChatPanel component |
| **File Manager** | Folder icon | Document history + upload |

Each app window is a self-contained component that renders inside the window chrome. State management via Zustand stays the same — just the shell changes.

---

## Implementation Plan

### Phase 1: Boot Sequence + Desktop Shell
1. Create `BootSequence` component — typewriter terminal animation
2. Create `Desktop` component — full-screen container with grid-bg, crt-scanlines
3. Create `DesktopIcon` component — icon + label, click handler
4. Wire boot → desktop transition with `sessionStorage` skip logic

### Phase 2: Taskbar
5. Create `Taskbar` component — fixed bottom bar
6. Add system clock (live `setInterval`, monospace)
7. Add user profile display (email from store)
8. Add running app indicators with focus/minimize toggle
9. Add logout (terminate session) button

### Phase 3: App Windows (21st.dev integration)
10. Create `AppWindow` wrapper — draggable, resizable window chrome using 21st.dev Floating Panel
11. Style window chrome: neon borders, monospace title bar, close/min/max buttons
12. Port existing components into windows:
    - `KnowledgeGraph` → Graph Window
    - `PdfViewer` → Viewer Window
    - `ChatPanel` → Chat Window
    - Document list + upload → File Manager Window

### Phase 4: Polish
13. Window stacking (click to bring to front, z-index management)
14. Desktop icon double-click to launch, single-click to select
15. Taskbar click to minimize/restore
16. Boot sequence skip on subsequent visits
17. `prefers-reduced-motion` — disable boot animation, reduce glitch effects
18. Mobile fallback — stack windows vertically, collapse taskbar to hamburger

---

## File Structure

```
apps/web/src/
├── components/
│   ├── os/
│   │   ├── BootSequence.tsx      # Terminal boot animation
│   │   ├── Desktop.tsx           # Desktop container + icon grid
│   │   ├── DesktopIcon.tsx       # Single desktop icon
│   │   ├── Taskbar.tsx           # Bottom taskbar
│   │   ├── AppWindow.tsx         # Draggable window wrapper (21st.dev)
│   │   ├── SystemClock.tsx       # Live clock widget
│   │   └── UserMenu.tsx          # User profile + logout
│   ├── apps/
│   │   ├── GraphApp.tsx          # Intelligence graph window content
│   │   ├── ViewerApp.tsx         # PDF viewer window content
│   │   ├── ChatApp.tsx           # Terminal chat window content
│   │   └── FileManagerApp.tsx    # Document list + upload
│   ├── KnowledgeGraph.tsx        # (existing)
│   ├── ChatPanel.tsx             # (existing)
│   ├── PdfViewer.tsx             # (existing)
│   └── ...
├── app/
│   ├── layout.tsx                # Root layout (fonts, global CSS)
│   ├── page.tsx                  # Desktop page (replaces login redirect)
│   └── globals.css               # OS-level styles
└── store/
    └── useStore.ts               # Window state, active app, auth
```

---

## Key Decisions

1. **No separate /login page** — auth check happens at desktop level; if no token, show login modal as an "OS dialog" on top of the desktop
2. **Single page app** — the entire OS is one route (`/`), all apps are windowed components, no routing between pages
3. **Window state in Zustand** — track open/closed/minimized/position/size per window
4. **21st.dev for window chrome** — use Floating Panel (ark-ui) for drag/resize/minimize/maximize, style with Hacker OS aesthetic
5. **Boot sequence cached** — `sessionStorage` flag, skip on repeat visits, allow skip on click

---

## Awaiting Approval

This plan replaces the current SaaS dashboard architecture entirely. The existing components (KnowledgeGraph, PdfViewer, ChatPanel) are preserved — only the shell changes.

Approve to begin implementation.
