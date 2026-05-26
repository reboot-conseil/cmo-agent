import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { storageGet } from '@/lib/storage'

export default async function Home() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const identity = await storageGet(userId, 'identity.md')
  if (!identity || identity.trim() === '') {
    redirect('/onboarding')
  }

  redirect('/calendrier')
}
