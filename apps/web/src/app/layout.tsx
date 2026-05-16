import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

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
    <html lang="en" className={`${geist.variable} ${geistMono.variable} dark`}>
      <body className="min-h-screen flex flex-col bg-void text-text-normal selection:bg-matrix-green/30 grid-bg crt-scanlines">
        {children}
      </body>
    </html>
  )
}
