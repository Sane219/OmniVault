"use client"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-800/60 rounded ${className}`}
    />
  )
}

export function DocumentListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="flex-1 h-4" />
        </div>
      ))}
    </div>
  )
}

export function GraphSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="flex gap-2">
        <Skeleton className="w-3 h-3 rounded-full" />
        <Skeleton className="w-3 h-3 rounded-full [animation-delay:150ms]" />
        <Skeleton className="w-3 h-3 rounded-full [animation-delay:300ms]" />
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
          <Skeleton className={`w-2/3 h-10 rounded-xl ${i % 2 === 0 ? 'rounded-tr-sm' : 'rounded-tl-sm'}`} />
        </div>
      ))}
    </div>
  )
}
