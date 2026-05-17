import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OmniVault — Terminal',
  description: 'AI-powered multimodal workspace for document analysis and knowledge extraction',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen w-screen bg-void text-text-normal selection:bg-matrix-green/30 overflow-hidden font-mono">
        {children}
      </body>
    </html>
  )
}
