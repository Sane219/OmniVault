"use client"
import { useDocumentManager } from '../../lib/useDocumentManager'
import { PdfViewer } from '../PdfViewer'
import { Upload, Loader2, FileText } from 'lucide-react'

export function ViewerApp() {
  const { activeDocument, documentUrl, processingStatus, isBusy, fileInputRef, handleFileUpload } = useDocumentManager()

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-panel-border bg-terminal shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-matrix-green" />
          <span className="text-[11px] font-mono text-text-dim uppercase tracking-widest">Document</span>
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
            <><Upload className="w-3 h-3 inline mr-1" />UPLOAD PDF</>
          )}
        </button>
      </div>

      {/* Viewer */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeDocument && documentUrl ? (
          <div className="w-full h-full">
            <PdfViewer url={documentUrl} />
          </div>
        ) : activeDocument ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-matrix-green-dim animate-spin" />
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full border-2 border-dashed border-matrix-green-dim flex flex-col items-center justify-center cursor-pointer hover:border-matrix-green hover:bg-matrix-green-faint transition-all group"
          >
            <Upload className="w-10 h-10 text-matrix-green-dim group-hover:text-matrix-green mb-3 transition-colors" />
            <p className="text-sm text-text-dim font-mono">Drop a PDF or click to upload</p>
          </div>
        )}
      </div>
    </div>
  )
}
