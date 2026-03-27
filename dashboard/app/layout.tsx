import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata: Metadata = { title: 'CMO Dashboard', description: 'Jonathan BRAUN — LinkedIn' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body className="min-h-screen antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
