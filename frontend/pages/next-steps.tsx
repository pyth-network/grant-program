import { Layout } from '@components/Layout'
import step6 from '@images/step6.png'
import { TokensReceived } from '@sections/TokensReceived'
import { useSearchParams } from 'next/navigation'

export const NEXT_STEPS = {
  url: '/next-steps',
  title: 'Next Steps',
  image: step6,
}

export default function NextStepsPage() {
  const params = useSearchParams()
  return (
    <Layout>
      <TokensReceived totalCoinsClaimed={params.get('totalTokensClaimed')} />
    </Layout>
  )
}
