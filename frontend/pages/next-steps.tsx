import { Layout } from '@components/Layout'
import step6 from '@images/next.png'
import { TokensReceived } from '@sections/TokensReceived'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export const NEXT_STEPS = {
  url: '/next-steps',
  title: 'Next Steps',
  image: step6,
}

export default function NextStepsPage() {
  // User has claimed, clear everything stored locally
  useEffect(() => {
    localStorage.clear()
  }, [])

  const params = useSearchParams()
  return (
    <Layout>
      <TokensReceived
        totalCoinsClaimed={params.get('totalTokensClaimed') ?? 'N/A'}
      />
    </Layout>
  )
}
