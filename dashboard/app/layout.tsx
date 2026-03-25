import type { Metadata } from 'next'
import './globals.css'
import { auth } from '@/auth'
import { storageGet } from '@/lib/storage'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'CMO Dashboard', description: 'Jonathan BRAUN — LinkedIn' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (session?.user?.id) {
    const headersList = await headers()
    const pathname = headersList.get('x-invoke-path') ?? headersList.get('x-pathname') ?? ''
    const isOnboarding = pathname.startsWith('/onboarding')
    const isSignIn = pathname.startsWith('/sign-in')

    if (!isOnboarding && !isSignIn) {
      const identity = await storageGet(session.user.id, 'config/identity.md')
      if (!identity) redirect('/onboarding')
    }
  }

  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
