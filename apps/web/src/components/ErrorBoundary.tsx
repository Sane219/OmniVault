"use client"
import React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  label?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`, error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6 text-center">
          <div className="w-12 h-12 rounded-terminal bg-red-alert/10 border border-red-alert/30 flex items-center justify-center mb-4 shadow-neon-red">
            <AlertCircle className="w-6 h-6 text-red-alert" />
          </div>
          <p className="text-sm font-mono font-semibold uppercase tracking-wider text-red-alert mb-1">
            {this.props.label ? `${this.props.label} crashed` : "system error"}
          </p>
          <p className="text-xs text-text-dim mb-4 max-w-xs truncate font-mono">
            {this.state.error?.message || "an unexpected error occurred"}
          </p>
          <button
            onClick={this.handleReset}
            className="btn-ghost flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            RETRY
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
