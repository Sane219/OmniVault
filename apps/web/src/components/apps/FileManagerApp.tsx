"use client"
import { useState } from 'react'
import { useDocumentManager } from '../../lib/useDocumentManager'
import { useStore, type DocumentRecord } from '../../store/useStore'
import { FolderOpen, Upload, Loader2, Clock, Trash2, Eye, X } from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    uploaded: 'text-[#4a5a4a]',
    processing: 'text-[#ffaa00]',
    completed: 'text-[#00ff88]',
    failed: 'text-[#ff3333]',
  }
  return (
    <span className={`text-[9px] font-mono uppercase tracking-wider ${map[status] ?? 'text-[#4a5a4a]'}`}>
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

  const { openWindow, setHistory, setActiveDocument, setDocumentUrl } = useStore()
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const onSelect = (doc: DocumentRecord) => {
    handleSelectDocument(doc)
    openWindow('viewer')
    openWindow('graph')
  }

  const onDelete = (docId: string) => {
    setHistory(history.filter(d => d.id !== docId))
    if (activeDocument === docId) {
      setActiveDocument(null)
      setDocumentUrl(null)
    }
    setDeleteConfirm(null)
  }

  const onPreview = (doc: DocumentRecord) => {
    setPreviewDoc(doc)
    handleSelectDocument(doc)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#335533] bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-[#00ff88]" />
          <span className="text-[11px] font-mono text-[#4a5a4a] uppercase tracking-widest">Files</span>
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
            <Loader2 className="w-5 h-5 text-[#00ff88]/40 animate-spin" />
          </div>
        )}

        {!historyLoading && history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[#4a5a4a]">
            <FolderOpen className="w-10 h-10 mb-3 text-[#00ff88]/30" />
            <p className="text-xs font-mono">No documents yet</p>
            <p className="text-[10px] text-[#4a5a4a] mt-1">Upload a PDF to get started</p>
          </div>
        )}

        {history.map((doc) => (
          <div
            key={doc.id}
            className={`w-full text-left px-3 py-2.5 rounded transition-all group ${
              activeDocument === doc.id
                ? 'bg-[#00ff88]/[0.08] border border-[#00ff88]/30'
                : 'hover:bg-[#00ff88]/[0.04] border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => onSelect(doc)} className="flex-1 text-left cursor-pointer">
                <p className="text-xs text-[#e0e0e0] font-medium truncate">{doc.title}</p>
              </button>
              <StatusBadge status={doc.status} />
            </div>
            {doc.created_at && (
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-[#335533]" />
                <p className="text-[10px] text-[#4a5a4a] font-mono">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onPreview(doc)}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono uppercase
                         text-[#00ff88]/60 border border-[#00ff88]/20 rounded
                         hover:bg-[#00ff88]/[0.08] hover:text-[#00ff88] cursor-pointer transition-all"
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
              {deleteConfirm === doc.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="px-2 py-1 text-[9px] font-mono uppercase bg-[#ff3333]/20 text-[#ff3333]
                             border border-[#ff3333]/30 rounded hover:bg-[#ff3333]/30 cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-2 py-1 text-[9px] font-mono uppercase text-[#4a5a4a]
                             border border-[#335533] rounded hover:bg-[#335533]/20 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(doc.id)}
                  className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono uppercase
                           text-[#ff3333]/60 border border-[#ff3333]/20 rounded
                           hover:bg-[#ff3333]/[0.08] hover:text-[#ff3333] cursor-pointer transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Inline Preview Panel */}
      {previewDoc && (
        <div className="absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-20 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#335533]">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#00ff88]" />
              <span className="text-[11px] font-mono text-[#00ff88]">{previewDoc.title}</span>
            </div>
            <button
              onClick={() => setPreviewDoc(null)}
              className="p-1 text-[#4a5a4a] hover:text-[#e0e0e0] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe
              src={`/api/documents/${previewDoc.id}/pdf`}
              className="w-full h-full border-0"
              title={previewDoc.title}
            />
          </div>
        </div>
      )}
    </div>
  )
}
