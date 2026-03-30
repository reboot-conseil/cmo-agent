import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CetteSemaineClient } from './CetteSemaineClient'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? ''

export default async function CetteSemainePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const isAdmin = userId === ADMIN_USER_ID
  return <CetteSemaineClient isAdmin={isAdmin} />
}
