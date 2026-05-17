"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'

interface HistoryEntry {
  command: string
  output: string[]
}

// Virtual filesystem
const FILESYSTEM: Record<string, Record<string, string[]>> = {
  '/': { type: ['dir'], contents: ['graph/', 'viewer/', 'chat/', 'files/'] },
  '/graph': { type: ['dir'], contents: ['intelligence.map', 'node_data.json', 'edges.csv'] },
  '/viewer': { type: ['dir'], contents: ['documents/', 'readme.md', 'config.json'] },
  '/chat': { type: ['dir'], contents: ['history.log', 'sessions.db'] },
  '/files': { type: ['dir'], contents: ['uploads/', 'processed/', 'temp/'] },
  '/graph/intelligence.map': { type: ['file'], contents: ['{"nodes": 272, "edges": 1847, "communities": 49}'] },
  '/graph/node_data.json': { type: ['file'], contents: ['[{"id": "n1", "label": "Core", "weight": 0.95},', ' {"id": "n2", "label": "API", "weight": 0.87}]'] },
  '/graph/edges.csv': { type: ['file'], contents: ['source,target,weight', 'n1,n2,0.92', 'n2,n3,0.78'] },
  '/viewer/readme.md': { type: ['file'], contents: ['# OmniVault', 'Intelligence document processing system.', 'Upload PDFs to extract knowledge graphs.'] },
  '/viewer/config.json': { type: ['file'], contents: ['{"theme": "hacker", "lang": "en", "maxUploadMB": 50}'] },
  '/chat/history.log': { type: ['file'], contents: ['[2026-05-17 03:12] SYSTEM: Session initiated', '[2026-05-17 03:13] USER: Analyze document structure'] },
  '/chat/sessions.db': { type: ['file'], contents: ['[binary data - 4.2KB]'] },
  '/files/uploads/': { type: ['dir'], contents: ['report_q1.pdf', 'architecture.pdf'] },
  '/files/processed/': { type: ['dir'], contents: ['report_q1.json', 'architecture.json'] },
  '/files/temp/': { type: ['dir'], contents: [] },
}

export function TerminalApp() {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { command: '', output: ['OmniVault Terminal v1.0.0', 'Type "help" for available commands.', ''] },
  ])
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState('/')
  const [cmdHistory, setCmdHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const historyFromStore = useStore(s => s.history)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [history])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const resolvePath = (path: string): string => {
    if (path.startsWith('/')) return path.replace(/\/$/, '') || '/'
    const parts = cwd.split('/').filter(Boolean).concat(path.split('/').filter(Boolean))
    const resolved: string[] = []
    for (const p of parts) {
      if (p === '..') resolved.pop()
      else if (p !== '.') resolved.push(p)
    }
    return '/' + resolved.join('/')
  }

  const execute = useCallback((cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) {
      setHistory(h => [...h, { command: cmd, output: [] }])
      return
    }

    const parts = trimmed.split(/\s+/)
    const command = parts[0]
    const args = parts.slice(1)
    let output: string[] = []

    switch (command) {
      case 'help':
        output = [
          'Available commands:',
          '  ls [path]         List directory contents',
          '  cd <path>         Change directory',
          '  cat <file>        Display file contents',
          '  pwd               Print working directory',
          '  clear             Clear terminal',
          '  whoami            Show current user',
          '  date              Show current date/time',
          '  uptime            Show system uptime',
          '  history           Show command history',
          '  docs              List documents from File Manager',
          '  echo <text>       Print text',
          '  tree [path]       Show directory tree',
          '  help              Show this help',
        ]
        break

      case 'ls': {
        const target = args[0] ? resolvePath(args[0]) : cwd
        const normalized = target.replace(/\/$/, '') || '/'
        const entry = FILESYSTEM[normalized]
        if (entry && entry.type[0] === 'dir') {
          output = entry.contents.length > 0 ? entry.contents : ['  (empty)']
        } else {
          output = [`ls: cannot access '${args[0] || target}': No such directory`]
        }
        break
      }

      case 'cd': {
        if (!args[0] || args[0] === '~') {
          setCwd('/')
          break
        }
        const target = resolvePath(args[0])
        const normalized = target.replace(/\/$/, '') || '/'
        const entry = FILESYSTEM[normalized]
        if (entry && entry.type[0] === 'dir') {
          setCwd(normalized === '' ? '/' : normalized)
        } else {
          output = [`cd: ${args[0]}: No such directory`]
        }
        break
      }

      case 'cat': {
        if (!args[0]) { output = ['cat: missing operand']; break }
        const target = resolvePath(args[0])
        const entry = FILESYSTEM[target]
        if (entry && entry.type[0] === 'file') {
          output = entry.contents
        } else {
          output = [`cat: ${args[0]}: No such file`]
        }
        break
      }

      case 'pwd':
        output = [cwd === '/' ? '/' : cwd]
        break

      case 'clear':
        setHistory([])
        return

      case 'whoami':
        output = ['operator@omnivault']
        break

      case 'date':
        output = [new Date().toString()]
        break

      case 'uptime':
        output = ['System online since boot sequence completion']
        break

      case 'history':
        output = cmdHistory.length > 0 ? cmdHistory : ['  (no previous commands)']
        break

      case 'docs':
        output = historyFromStore.length > 0
          ? historyFromStore.map(d => `  ${d.id.slice(0, 8)}  ${d.status.padEnd(12)}  ${d.title}`)
          : ['  (no documents uploaded)']
        break

      case 'echo':
        output = [args.join(' ')]
        break

      case 'tree': {
        const target = args[0] ? resolvePath(args[0]) : cwd
        const normalized = target.replace(/\/$/, '') || '/'
        const treeOutput: string[] = [normalized === '/' ? '/' : normalized.split('/').pop() + '/']
        const entry = FILESYSTEM[normalized]
        if (entry && entry.type[0] === 'dir') {
          entry.contents.forEach((item, i) => {
            const isLast = i === entry.contents.length - 1
            const prefix = isLast ? '  └── ' : '  ├── '
            const isDir = item.endsWith('/')
            treeOutput.push(prefix + item)
            if (isDir) {
              const subPath = normalized === '/' ? '/' + item.slice(0, -1) : normalized + '/' + item.slice(0, -1)
              const subEntry = FILESYSTEM[subPath]
              if (subEntry) {
                subEntry.contents.forEach((sub, j) => {
                  const subIsLast = j === subEntry.contents.length - 1
                  const subPrefix = isLast ? '      ' : '  │   '
                  treeOutput.push(subPrefix + (subIsLast ? '  └── ' : '  ├── ') + sub)
                })
              }
            }
          })
        }
        output = treeOutput
        break
      }

      default:
        output = [`command not found: ${command}`]
    }

    setHistory(h => [...h, { command: cmd, output }])
    setCmdHistory(h => [...h, cmd])
    setHistIdx(-1)
  }, [cwd, cmdHistory, historyFromStore])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      execute(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (cmdHistory.length > 0) {
        const newIdx = histIdx < cmdHistory.length - 1 ? histIdx + 1 : histIdx
        setHistIdx(newIdx)
        setInput(cmdHistory[cmdHistory.length - 1 - newIdx] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx > 0) {
        const newIdx = histIdx - 1
        setHistIdx(newIdx)
        setInput(cmdHistory[cmdHistory.length - 1 - newIdx] || '')
      } else {
        setHistIdx(-1)
        setInput('')
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Simple tab completion for commands
      const cmds = ['ls', 'cd', 'cat', 'pwd', 'clear', 'whoami', 'date', 'uptime', 'history', 'docs', 'echo', 'tree', 'help']
      const match = cmds.filter(c => c.startsWith(input))
      if (match.length === 1) setInput(match[0])
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setHistory([])
    }
  }

  return (
    <div
      className="h-full flex flex-col bg-[#0a0a0a] font-mono text-[13px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {history.map((entry, i) => (
          <div key={i}>
            {entry.command && (
              <div className="flex gap-2">
                <span className="text-[#00ff88]">operator@omnivault</span>
                <span className="text-[#4a5a4a]">:</span>
                <span className="text-[#00ccff]">{cwd}</span>
                <span className="text-[#4a5a4a]">$</span>
                <span className="text-[#e0e0e0]">{entry.command}</span>
              </div>
            )}
            {entry.output.map((line, j) => (
              <div key={j} className="text-[#b0b0b0] whitespace-pre">{line}</div>
            ))}
          </div>
        ))}

        {/* Input line */}
        <div className="flex gap-2">
          <span className="text-[#00ff88]">operator@omnivault</span>
          <span className="text-[#4a5a4a]">:</span>
          <span className="text-[#00ccff]">{cwd}</span>
          <span className="text-[#4a5a4a]">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-[#e0e0e0] caret-[#00ff88]"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  )
}
