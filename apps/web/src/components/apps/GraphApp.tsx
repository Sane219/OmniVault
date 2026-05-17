"use client"
import { useDocumentManager } from '../../lib/useDocumentManager'
import { KnowledgeGraph } from '../KnowledgeGraph'
import { ErrorBoundary } from '../ErrorBoundary'
import { Network, Loader2 } from 'lucide-react'

export function GraphApp() {
  const { processingStatus, graphData, hasError, statusMessage, errorMessage } = useDocumentManager()

  return (
    <div className="h-full flex flex-col">
      {/* Status Bar */}
      <div className={`flex items-center gap-3 px-4 py-2 border-b border-panel-border shrink-0 ${
        hasError ? 'bg-red-alert/10' : 'bg-terminal'
      }`}>
        <Network className="w-4 h-4 text-matrix-green shrink-0" />
        <span className="text-[11px] font-mono text-text-dim truncate">
          {hasError ? errorMessage : statusMessage}
        </span>
      </div>

      {/* Graph */}
      <div className="flex-1 min-h-0 relative grid-bg">
        {processingStatus === 'completed' && graphData ? (
          <div className="absolute inset-0">
            <ErrorBoundary label="Knowledge Graph">
              <KnowledgeGraph graphData={graphData} />
            </ErrorBoundary>
          </div>
        ) : processingStatus === 'processing' || processingStatus === 'uploading' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-matrix-green-dim animate-spin mb-3" />
            <p className="text-xs text-text-dim font-mono">Processing document...</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-dim">
            <div className="w-14 h-14 rounded-panel bg-matrix-green-faint border border-panel-border flex items-center justify-center mb-3">
              <Network className="w-7 h-7 text-matrix-green-dim" />
            </div>
            <p className="font-mono text-xs uppercase tracking-widest">
              {hasError ? 'Processing Failed' : 'No Data'}
            </p>
            <p className="text-[11px] text-text-dim mt-1">Upload a document first</p>
          </div>
        )}
      </div>
    </div>
  )
}
