import { TokensEligible } from '@sections/TokensEligible'
import { useSearchParams } from 'next/navigation'

export const NEXT_STEPS = {
  url: '/next-steps',
  title: 'Next Steps',
}

export default function NextStepsPage() {
  const params = useSearchParams()
  return <TokensEligible totalCoinsClaimed={params.get('eligibleTokens')} />
}
