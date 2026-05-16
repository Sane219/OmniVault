"use client"
import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { pdfjs, Document, Page } from "react-pdf"
import "react-pdf/dist/esm/Page/AnnotationLayer.css"
import "react-pdf/dist/esm/Page/TextLayer.css"
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

interface PdfViewerProps {
  url: string
}

function PdfViewerInner({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-secondary/40 shrink-0">
        <button
          onClick={goToPrev}
          disabled={pageNumber <= 1}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-gray-400">
          {loading ? "Loading..." : `Page ${pageNumber} of ${numPages}`}
        </span>
        <button
          onClick={goToNext}
          disabled={pageNumber >= numPages}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-background/50">
        {error ? (
          <div className="flex flex-col items-center gap-3 text-red-400 mt-12">
            <AlertCircle className="w-10 h-10 opacity-60" />
            <p className="text-sm font-mono">{error}</p>
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center gap-2 text-gray-500 mt-12">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-mono">Loading PDF...</span>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-lg shadow-black/40 rounded"
            />
          </Document>
        )}
      </div>
    </div>
  )
}

export const PdfViewer = dynamic(() => Promise.resolve(PdfViewerInner), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-600">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  ),
})
