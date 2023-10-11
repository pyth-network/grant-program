import { useRouter } from 'next/navigation'
import { PastActivity } from '@sections/PastActivity'
import { WELCOME_METADATA } from '.'
import { VERIFY_ELIGIBILITY_METADATA } from './verify-eligibility'

export const REVIEW_ELIGIBILITY_METADATA = {
  url: '/review-eligibility',
  title: 'Review Airdrop Eligibility',
}

export default function ReviewEligibilitPage() {
  const router = useRouter()

  return (
    <PastActivity
      onBack={() => {
        router.push(WELCOME_METADATA.url)
      }}
      onProceed={() => {
        router.push(VERIFY_ELIGIBILITY_METADATA.url)
      }}
    />
  )
}
