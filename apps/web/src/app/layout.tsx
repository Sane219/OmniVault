import type { Metadata } from 'next'
import { Fira_Code, Fira_Sans } from 'next/font/google'
import './globals.css'

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
  display: 'swap',
})

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fira-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'OmniVault Workspace',
  description: 'AI-powered multimodal workspace',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${firaCode.variable} ${firaSans.variable} dark`}>
      <body className="min-h-screen flex flex-col bg-background text-text selection:bg-cta/30">
        {children}
      </body>
    </html>
  )
}
