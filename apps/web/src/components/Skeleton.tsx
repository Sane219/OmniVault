"use client"

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div className={`matrix-shimmer bg-panel rounded-terminal ${className}`} style={style} />
  )
}

export function DocumentListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded-terminal" style={{ animationDelay: `${i * 200}ms` }} />
          <Skeleton className="flex-1 h-4" style={{ animationDelay: `${i * 200 + 100}ms` }} />
        </div>
      ))}
    </div>
  )
}

export function GraphSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="flex gap-2">
        {[0, 200, 400].map((delay) => (
          <div
            key={delay}
            className="w-2 h-2 rounded-full bg-matrix-green matrix-shimmer"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <Skeleton className="w-32 h-4" />
      <Skeleton className="w-48 h-3" />
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <Skeleton className={`w-2/3 h-10 rounded-terminal ${i % 2 === 0 ? 'rounded-tr-none' : 'rounded-tl-none'}`} style={{ animationDelay: `${i * 300}ms` }} />
        </div>
      ))}
    </div>
  )
}
