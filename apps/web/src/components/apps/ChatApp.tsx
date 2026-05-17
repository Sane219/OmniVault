"use client"
import { ErrorBoundary } from '../ErrorBoundary'
import { ChatPanel } from '../ChatPanel'

export function ChatApp() {
  return (
    <div className="h-full">
      <ErrorBoundary label="Chat">
        <ChatPanel />
      </ErrorBoundary>
    </div>
  )
}
