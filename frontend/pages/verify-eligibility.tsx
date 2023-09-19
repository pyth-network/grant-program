import { Layout } from '@components/Layout'
import { useRouter } from 'next/navigation'
import step3 from '../images/step3.png'
import { VerifyEligibility } from '@sections/VerifyEligibility'
import { REVIEW_ELIGIBILITY_METADATA } from './review-eligibility'
import { LOGIN_SOLANA_METADATA } from './login-solana'

export const VERIFY_ELIGIBILITY_METADATA = {
  url: '/verify-eligibility',
  title: 'Verify Eligibility',
  image: step3,
}

export default function VerifyEligibilityPage() {
  const router = useRouter()

  return (
    <Layout>
      <VerifyEligibility
        onBack={() => {
          router.push(REVIEW_ELIGIBILITY_METADATA.url)
        }}
        onProceed={() => {
          router.push(LOGIN_SOLANA_METADATA.url)
        }}
      />
    </Layout>
  )
}
