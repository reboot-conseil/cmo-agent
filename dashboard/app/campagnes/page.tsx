import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listCampaigns } from '@/lib/parse-campaigns'
import { CampaignProvider } from '@/context/CampaignContext'
import { Sidebar } from '@/components/Sidebar'
import { CampaignList } from '@/components/CampaignList'
import { CampaignDetail } from '@/components/CampaignDetail'
import { CampaignGenerator } from '@/components/CampaignGenerator'
import { StrategyPlanner } from '@/components/StrategyPlanner'

export default async function CampagnesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')
  const campaigns = await listCampaigns(session.user.id)

  return (
    <CampaignProvider initialCampaigns={campaigns}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <CampaignList />
          <CampaignDetail />
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <CampaignGenerator />
            <StrategyPlanner />
          </div>
        </div>
      </div>
    </CampaignProvider>
  )
}
