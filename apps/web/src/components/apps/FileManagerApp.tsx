"use client"
import { useDocumentManager } from '../../lib/useDocumentManager'
import { useStore, type DocumentRecord } from '../../store/useStore'
import { FolderOpen, Upload, Loader2, Clock } from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    uploaded: 'text-text-dim',
    processing: 'text-amber',
    completed: 'text-matrix-green',
    failed: 'text-red-alert',
  }
  return (
    <span className={`text-[9px] font-mono uppercase tracking-wider ${map[status] ?? 'text-text-dim'}`}>
      {status}
    </span>
  )
}

export function FileManagerApp() {
  const {
    history, historyLoading, activeDocument,
    fileInputRef, handleFileUpload, handleSelectDocument,
    isBusy, processingStatus,
  } = useDocumentManager()

  const openWindow = useStore(s => s.openWindow)

  const onSelect = (doc: DocumentRecord) => {
    handleSelectDocument(doc)
    openWindow('viewer')
    openWindow('graph')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-panel-border bg-terminal shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-matrix-green" />
          <span className="text-[11px] font-mono text-text-dim uppercase tracking-widest">Files</span>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className="btn-neon text-[10px] px-3 py-1.5"
        >
          {processingStatus === 'uploading' ? (
            <><Loader2 className="w-3 h-3 animate-spin inline mr-1" />UPLOADING</>
          ) : (
            <><Upload className="w-3 h-3 inline mr-1" />UPLOAD</>
          )}
        </button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {historyLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-matrix-green-dim animate-spin" />
          </div>
        )}

        {!historyLoading && history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-dim">
            <FolderOpen className="w-10 h-10 mb-3 text-matrix-green-dim" />
            <p className="text-xs font-mono">No documents yet</p>
            <p className="text-[10px] text-text-dim mt-1">Upload a PDF to get started</p>
          </div>
        )}

        {history.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelect(doc)}
            className={`w-full text-left px-3 py-2.5 rounded-panel transition-all cursor-pointer group hover-glitch ${
              activeDocument === doc.id
                ? 'bg-matrix-green-faint border border-panel-border-hover'
                : 'hover:bg-panel-hover border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-text-normal font-medium truncate flex-1">{doc.title}</p>
              <StatusBadge status={doc.status} />
            </div>
            {doc.created_at && (
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-text-ghost" />
                <p className="text-[10px] text-text-dim font-mono">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
