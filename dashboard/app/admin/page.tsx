import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUsageSummary, listAllUsersUsage } from '@/lib/usage'
import { AdminPanel } from '@/components/AdminPanel'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? 'jonathan'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId || userId !== ADMIN_USER_ID) redirect('/')

  const now = new Date()
  const months: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toISOString().slice(0, 7))
  }
  const [history, allUsersUsage] = await Promise.all([
    Promise.all(months.map(m => getUsageSummary(userId, m))),
    listAllUsersUsage(),
  ])

  return <AdminPanel history={history} allUsersUsage={allUsersUsage} />
}
