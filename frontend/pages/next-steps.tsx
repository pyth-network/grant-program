import { TokensReceived } from '@sections/TokensReceived'
import { useSearchParams } from 'next/navigation'

export const NEXT_STEPS = {
  url: '/next-steps',
  title: 'Next Steps',
}

export default function NextStepsPage() {
  const params = useSearchParams()
  return <TokensReceived totalCoinsClaimed={params.get('totalTokensClaimed')} />
}
