import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { listCampaigns } from '@/lib/parse-campaigns'
import { CampaignProvider } from '@/context/CampaignContext'
import { Sidebar } from '@/components/Sidebar'
import { CampaignList } from '@/components/CampaignList'
import { CampaignDetail } from '@/components/CampaignDetail'
import { CampaignGenerator } from '@/components/CampaignGenerator'
import { StrategyPlanner } from '@/components/StrategyPlanner'

export default async function CampagnesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const campaigns = await listCampaigns(userId)

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
