import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// We are getting many hydration errors for this component.
// The content changes on the client side as there are many wallets' connections
// related and localStorage read events going on.
const NoSSREligibility = dynamic(() => import('@sections/WalletsEligibility'), {
  ssr: false,
})

export default function VerifyEligibilityPage() {
  const router = useRouter()

  return (
    <NoSSREligibility
      onBack={() => router.push('/verify-eligibility')}
      onProceed={(eligibleTokens: string) =>
        router.push(`/next-steps?eligibleTokens=${eligibleTokens}`)
      }
    />
  )
}
