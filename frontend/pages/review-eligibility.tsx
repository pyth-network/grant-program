import { Layout } from '@components/Layout'
import { useRouter } from 'next/navigation'
import step2 from '../images/step2.png'
import { PastActivity } from '@sections/PastActivity'
import { WELCOME_METADATA } from '.'
import { VERIFY_ELIGIBILITY_METADATA } from './verify-eligibility'

export const REVIEW_ELIGIBILITY_METADATA = {
  url: '/review-eligibility',
  title: 'Review Airdrop Eligibility',
  image: step2,
}

export default function ReviewEligibilitPage() {
  const router = useRouter()

  return (
    <Layout>
      <PastActivity
        onBack={() => {
          router.push(WELCOME_METADATA.url)
        }}
        onProceed={() => {
          router.push(VERIFY_ELIGIBILITY_METADATA.url)
        }}
      />
    </Layout>
  )
}
