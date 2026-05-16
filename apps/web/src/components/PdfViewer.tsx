"use client"
import { useState, useCallback, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react"

interface PdfViewerProps {
  url: string
}

function PdfViewerInner({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [PdfComp, setPdfComp] = useState<{
    Document: React.ComponentType<any>
    Page: React.ComponentType<any>
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const reactPdf = await import("react-pdf")
        const pdfjs = reactPdf.pdfjs
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
        if (!cancelled) {
          setPdfComp({ Document: reactPdf.Document, Page: reactPdf.Page })
          await import("react-pdf/dist/Page/AnnotationLayer.css")
          await import("react-pdf/dist/Page/TextLayer.css")
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load PDF viewer")
      }
    })()
    return () => { cancelled = true }
  }, [])

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total)
      setPageNumber(1)
      setLoading(false)
      setError(null)
    },
    []
  )

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message || "Failed to load PDF")
    setLoading(false)
  }, [])

  const goToPrev = () => setPageNumber((p) => Math.max(1, p - 1))
  const goToNext = () => setPageNumber((p) => Math.min(numPages, p + 1))

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border bg-panel/40 shrink-0">
        <button
          onClick={goToPrev}
          disabled={pageNumber <= 1}
          className="p-1 text-text-dim hover:text-matrix-green disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors hover-glitch"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-matrix-green/60 uppercase tracking-wider">
          {loading ? "loading..." : `page ${pageNumber} / ${numPages}`}
        </span>
        <button
          onClick={goToNext}
          disabled={pageNumber >= numPages}
          className="p-1 text-text-dim hover:text-matrix-green disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors hover-glitch"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-void/50">
        {error ? (
          <div className="flex flex-col items-center gap-3 text-red-alert mt-12">
            <AlertCircle className="w-10 h-10 opacity-60" />
            <p className="text-sm font-mono uppercase tracking-wider">{error}</p>
          </div>
        ) : !PdfComp ? (
          <div className="flex items-center gap-2 text-text-dim mt-12">
            <Loader2 className="w-5 h-5 animate-spin text-matrix-green" />
            <span className="text-sm font-mono uppercase tracking-wider">initializing viewer...</span>
          </div>
        ) : (
          <PdfComp.Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center gap-2 text-text-dim mt-12">
                <Loader2 className="w-5 h-5 animate-spin text-matrix-green" />
                <span className="text-sm font-mono uppercase tracking-wider">loading document...</span>
              </div>
            }
          >
            <PdfComp.Page
              pageNumber={pageNumber}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-neon rounded-terminal"
            />
          </PdfComp.Document>
        )}
      </div>
    </div>
  )
}

export { PdfViewerInner as PdfViewer }
