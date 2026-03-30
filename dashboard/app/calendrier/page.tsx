import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { listIdeas } from '@/lib/parse-ideas'
import { IdeaProvider } from '@/context/IdeaContext'
import { Sidebar } from '@/components/Sidebar'
import { BacklogPanel } from '@/components/BacklogPanel'
import { CalendarGrid } from '@/components/CalendarGrid'
import { DetailPanel } from '@/components/DetailPanel'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? ''

export default async function CalendrierPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const isAdmin = userId === ADMIN_USER_ID
  const ideas = await listIdeas(userId)

  return (
    <IdeaProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar isAdmin={isAdmin} />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <BacklogPanel ideas={ideas} />
          <CalendarGrid ideas={ideas} />
          <DetailPanel allIdeas={ideas} />
        </div>
      </div>
    </IdeaProvider>
  )
}
