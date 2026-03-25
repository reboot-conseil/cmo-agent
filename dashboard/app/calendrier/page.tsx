import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listIdeas } from '@/lib/parse-ideas'
import { IdeaProvider } from '@/context/IdeaContext'
import { Sidebar } from '@/components/Sidebar'
import { BacklogPanel } from '@/components/BacklogPanel'
import { CalendarGrid } from '@/components/CalendarGrid'
import { DetailPanel } from '@/components/DetailPanel'

export default async function CalendrierPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')
  const ideas = await listIdeas(session.user.id)

  return (
    <IdeaProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <BacklogPanel ideas={ideas} />
          <CalendarGrid ideas={ideas} />
          <DetailPanel allIdeas={ideas} />
        </div>
      </div>
    </IdeaProvider>
  )
}
